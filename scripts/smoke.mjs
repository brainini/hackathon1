#!/usr/bin/env node
/**
 * TWOPICK end-to-end API smoke test (Node 24, no dependencies).
 *
 *   BASE_URL=http://localhost:3000 ADMIN_PASSWORD=admin node scripts/smoke.mjs
 *
 * ⚠️  DESTRUCTIVE: wipes ALL data on the target server (admin "reset all") at the start and the end.
 * Never point it at the live class deployment.
 */

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

/* ───────────────────────────── tiny test harness ───────────────────────────── */

let passed = 0;
const failures = [];

function show(detail) {
  if (detail === undefined) return "";
  const text = typeof detail === "string" ? detail : JSON.stringify(detail);
  return ` — ${text.length > 400 ? `${text.slice(0, 400)}…` : text}`;
}

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ✗ ${label}${show(detail)}`);
  }
  return Boolean(condition);
}

function section(title) {
  console.log(`\n▶ ${title}`);
}

function expectStatus(label, res, status) {
  return check(`${label} → ${status}`, res.status === status, { status: res.status, body: res.data });
}

function expectError(label, res, status, code, fieldKeys = []) {
  const err = res.data?.error;
  const fieldsOk = fieldKeys.every((key) => typeof err?.fieldErrors?.[key] === "string");
  return check(
    `${label} → ${status} ${code}${fieldKeys.length ? ` (fieldErrors: ${fieldKeys.join(", ")})` : ""}`,
    res.status === status && err?.code === code && typeof err?.message === "string" && err.message.length > 0 && fieldsOk,
    { status: res.status, body: res.data },
  );
}

const sameList = (a, b) => Array.isArray(a) && a.length === b.length && a.every((v, i) => v === b[i]);

/* ───────────────────────────── HTTP client with a cookie jar ───────────────────────────── */

class Client {
  constructor(label) {
    this.label = label;
    this.jar = new Map();
  }

  has(name) {
    return this.jar.has(name);
  }

  setRawCookie(name, value) {
    this.jar.set(name, value);
  }

  absorb(res) {
    for (const line of res.headers.getSetCookie()) {
      const [pair, ...attrs] = line.split(";").map((part) => part.trim());
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      const attr = (key) => attrs.find((a) => a.toLowerCase().startsWith(`${key}=`))?.slice(key.length + 1);
      const maxAge = attr("max-age");
      const expires = attr("expires");
      const expired =
        value === "" ||
        (maxAge !== undefined && Number(maxAge) <= 0) ||
        (expires !== undefined && Date.parse(expires) <= Date.now());
      if (expired) this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }

  async request(method, path, body, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (this.jar.size > 0) headers.cookie = [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
    let payload;
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      payload = typeof body === "string" ? body : JSON.stringify(body);
    }
    const res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: payload,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    this.absorb(res);
    const type = res.headers.get("content-type") || "";
    let data = null;
    let bytes = null;
    if (type.includes("application/json")) data = await res.json().catch(() => null);
    else bytes = Buffer.from(await res.arrayBuffer());
    return { status: res.status, headers: res.headers, data, bytes };
  }

  get(path, headers) {
    return this.request("GET", path, undefined, headers);
  }
  post(path, body = {}, headers) {
    return this.request("POST", path, body, headers);
  }
  patch(path, body) {
    return this.request("PATCH", path, body);
  }
  del(path) {
    return this.request("DELETE", path);
  }
}

/* ───────────────────────────── fixtures ───────────────────────────── */

const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const PNG_URL = `data:image/png;base64,${PNG_B64}`;
const GIF_URL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const JPEG_BYTES = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.from("JFIF\0smoke-test-jpeg-bytes")]);
const PNG_WITH_JPEG_BYTES = `data:image/png;base64,${JPEG_BYTES.toString("base64")}`;
const SVG_URL = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString("base64")}`;
const OVERSIZE_PNG = `data:image/png;base64,${Buffer.concat([Buffer.from(PNG_B64, "base64"), Buffer.alloc(1_600_000)]).toString("base64")}`;

function registration(name, pin, extra = {}) {
  return {
    name,
    title: `${name.split(" ")[0]}의 스모크 앱`,
    description: "스모크 테스트용 작품이에요.\n두 줄짜리 소개!",
    link: "example.com/demo",
    emoji: "🦊",
    color: "mint",
    pin,
    image: null,
    ...extra,
  };
}

/* ───────────────────────────── scenario ───────────────────────────── */

async function main() {
  console.log(`TWOPICK smoke test → ${BASE_URL}`);
  console.log("⚠️  This wipes all data on the target server.\n");

  const admin = new Client("admin");
  const anon = new Client("anon");
  const u = { 1: new Client("u1"), 2: new Client("u2"), 3: new Client("u3"), 4: new Client("u4") };
  const ids = {};

  section("Admin authentication");
  expectError("anonymous GET /api/admin/state", await anon.get("/api/admin/state"), 401, "UNAUTHORIZED");
  expectError("admin login with wrong password", await admin.post("/api/admin/login", { password: "definitely-wrong" }), 401, "UNAUTHORIZED");
  let res = await admin.post("/api/admin/login", { password: ADMIN_PASSWORD });
  expectStatus("admin login with right password", res, 200);
  check("admin cookie set (httpOnly)", admin.has("tp_admin") && /httponly/i.test(res.headers.get("set-cookie") || ""), res.headers.get("set-cookie"));
  res = await admin.get("/api/admin/state");
  expectStatus("GET /api/admin/state as admin", res, 200);
  check("admin state is no-store", (res.headers.get("cache-control") || "").includes("no-store"), res.headers.get("cache-control"));
  expectError("cross-site POST is refused", await anon.post("/api/logout", {}, { "sec-fetch-site": "cross-site" }), 403, "FORBIDDEN");

  section("Reset everything");
  expectError("reset with wrong confirm word", await admin.post("/api/admin/reset", { scope: "all", confirm: "reset" }), 400, "VALIDATION", ["confirm"]);
  const versionBefore = (await admin.get("/api/admin/state")).data?.version ?? 0;
  res = await admin.post("/api/admin/reset", { scope: "all", confirm: "초기화" });
  expectStatus("reset all", res, 200);
  check("after reset: registration, 0 candidates", res.data?.phase === "registration" && res.data?.candidates?.length === 0, res.data);
  check("version keeps increasing across a reset", res.data?.version > versionBefore, { before: versionBefore, after: res.data?.version });
  res = await admin.patch("/api/admin/settings", { eventTitle: "  스모크   데모데이 ", votesPerVoter: 2, allowVoteChange: true, showFullRanking: false });
  expectStatus("settings → defaults for the test", res, 200);
  check("eventTitle trimmed + collapsed", res.data?.settings?.eventTitle === "스모크 데모데이", res.data?.settings);
  expectError("settings votesPerVoter=9", await admin.patch("/api/admin/settings", { votesPerVoter: 9 }), 400, "VALIDATION", ["votesPerVoter"]);

  section("Initial public state");
  res = await anon.get("/api/state");
  expectStatus("GET /api/state", res, 200);
  check("phase registration, no candidates, me null, results null",
    res.data?.phase === "registration" && res.data?.candidates?.length === 0 && res.data?.me === null && res.data?.results === null, res.data);
  check("public state is no-store", (res.headers.get("cache-control") || "").includes("no-store"), res.headers.get("cache-control"));
  check("storage kind reported", ["redis", "file", "memory"].includes(res.data?.storage), res.data?.storage);

  section("Register + NOT_ENOUGH_CANDIDATES");
  res = await u[1].post("/api/register", registration("Alice 가람", "1111", { image: PNG_URL }));
  expectStatus("register Alice (with PNG)", res, 201);
  ids[1] = res.data?.me?.id;
  check("voter cookie set + me matches candidate", u[1].has("tp_voter") && ids[1] && res.data?.candidate?.id === ids[1], res.data);
  check("candidate fields normalised", res.data?.candidate?.entryNo === 1 && res.data?.candidate?.link === "https://example.com/demo" &&
    res.data?.candidate?.description === "스모크 테스트용 작품이에요.\n두 줄짜리 소개!" && res.data?.candidate?.hasVoted === false, res.data?.candidate);
  check("candidate has an image URL and no secrets", /^\/api\/images\/[A-Za-z0-9_-]+$/.test(res.data?.candidate?.imageUrl ?? "") &&
    !("pinHash" in (res.data?.candidate ?? {})), res.data?.candidate);
  let aliceImage = res.data?.candidate?.imageUrl;
  expectError("phase → voting with 1 participant", await admin.post("/api/admin/phase", { phase: "voting" }), 409, "NOT_ENOUGH_CANDIDATES");

  const others = { 2: ["Bob 나래", "2222"], 3: ["Carol 다온", "3333"], 4: ["Dave 라희", "4444"] };
  for (const n of [2, 3, 4]) {
    res = await u[n].post("/api/register", registration(others[n][0], others[n][1], { color: "sky", emoji: "🐼" }));
    expectStatus(`register ${others[n][0]}`, res, 201);
    ids[n] = res.data?.me?.id;
    check(`${others[n][0]} got entryNo ${n} + cookie`, res.data?.candidate?.entryNo === n && u[n].has("tp_voter"), res.data?.candidate);
  }

  section("Duplicate names & invalid input");
  expectError("same name, different case/spaces", await anon.post("/api/register", registration("  alice   가람 ", "9999")), 409, "NAME_TAKEN", ["name"]);
  expectError("same name with a zero-width space", await anon.post("/api/register", registration("ALICE​ 가람", "9999")), 409, "NAME_TAKEN");
  res = await anon.post("/api/register", { name: "   ", title: "x".repeat(41), description: "", link: "javascript:alert(1)", emoji: "💩", color: "purple", pin: "12a4", image: null });
  expectError("invalid fields", res, 400, "VALIDATION", ["name", "title", "description", "link", "emoji", "color", "pin"]);
  expectError("malformed JSON body", await anon.post("/api/register", "{not json"), 400, "BAD_REQUEST");
  expectError("body over the size cap", await anon.post("/api/register", { ...registration("Big 바디", "1234"), description: "a".repeat(3_500_000) }), 413, "PAYLOAD_TOO_LARGE");

  section("Bad images");
  expectError("SVG data URL", await anon.post("/api/register", registration("Svg 시도", "1234", { image: SVG_URL })), 400, "VALIDATION", ["image"]);
  expectError("PNG declared, JPEG bytes", await anon.post("/api/register", registration("Mismatch 시도", "1234", { image: PNG_WITH_JPEG_BYTES })), 400, "VALIDATION", ["image"]);
  expectError("oversize image (1.6 MB)", await anon.post("/api/register", registration("Huge 시도", "1234", { image: OVERSIZE_PNG })), 413, "PAYLOAD_TOO_LARGE");
  expectError("garbage base64", await anon.post("/api/register", registration("Garbage 시도", "1234", { image: "data:image/png;base64,@@@@" })), 400, "VALIDATION", ["image"]);
  res = await anon.get("/api/state");
  check("rejected registrations created nothing", res.data?.candidates?.length === 4, res.data?.candidates?.map((c) => c.name));

  section("Images");
  res = await anon.get(aliceImage);
  expectStatus("GET uploaded image", res, 200);
  check("image content-type image/png", res.headers.get("content-type") === "image/png", res.headers.get("content-type"));
  check("immutable cache header", /max-age=31536000/.test(res.headers.get("cache-control") || "") && /immutable/.test(res.headers.get("cache-control") || ""), res.headers.get("cache-control"));
  check("nosniff header", res.headers.get("x-content-type-options") === "nosniff");
  check("image bytes round-trip", res.bytes?.equals(Buffer.from(PNG_B64, "base64")), res.bytes?.length);
  expectError("unknown image id", await anon.get("/api/images/doesNotExist1234"), 404, "NOT_FOUND");
  res = await anon.get("/api/images/..%2F..%2Ftwopick.json");
  check("path traversal attempt is not served", res.status === 404 || res.status === 400, { status: res.status });

  section("since= polling");
  res = await anon.get("/api/state");
  const v1 = res.data?.version;
  res = await anon.get(`/api/state?since=${v1}`);
  check("?since=<current> → unchanged", res.status === 200 && res.data?.unchanged === true && res.data?.version === v1 && typeof res.data?.serverTime === "number", res.data);
  res = await anon.get("/api/state?since=banana");
  check("?since=<garbage> → full state", res.data?.unchanged === false && Array.isArray(res.data?.candidates), res.data?.unchanged);
  expectError("PATCH /api/me without cookie", await anon.patch("/api/me", { title: "hi" }), 401, "UNAUTHORIZED");
  res = await u[2].patch("/api/me", { name: "Bobby 나래" });
  expectStatus("PATCH /api/me rename", res, 200);
  check("rename reflected in response", res.data?.me?.name === "Bobby 나래" && res.data?.candidate?.name === "Bobby 나래", res.data);
  res = await anon.get(`/api/state?since=${v1}`);
  check("after a mutation ?since=<old> → full state", res.data?.unchanged === false && res.data?.version > v1 &&
    res.data?.candidates?.find((c) => c.id === ids[2])?.name === "Bobby 나래", { version: res.data?.version, unchanged: res.data?.unchanged });
  expectError("rename onto someone else's name", await u[2].patch("/api/me", { name: "carol 다온" }), 409, "NAME_TAKEN");
  const v2 = (await anon.get("/api/state")).data?.version;
  expectStatus("PATCH /api/me with no changes", await u[2].patch("/api/me", {}), 200);
  check("no-op PATCH does not bump the version", (await anon.get(`/api/state?since=${v2}`)).data?.unchanged === true);
  res = await u[1].patch("/api/me", { image: GIF_URL });
  expectStatus("replace screenshot (GIF)", res, 200);
  const aliceGif = res.data?.candidate?.imageUrl;
  check("replacement gets a new image id", aliceGif && aliceGif !== aliceImage, { before: aliceImage, after: aliceGif });
  expectError("old screenshot is deleted", await anon.get(aliceImage), 404, "NOT_FOUND");
  res = await anon.get(aliceGif);
  check("new screenshot served as image/gif", res.status === 200 && res.headers.get("content-type") === "image/gif", { status: res.status, type: res.headers.get("content-type") });
  res = await u[1].patch("/api/me", { image: null });
  check("remove screenshot → imageUrl null", res.status === 200 && res.data?.candidate?.imageUrl === null, res.data);
  expectError("removed screenshot is gone", await anon.get(aliceGif), 404, "NOT_FOUND");
  aliceImage = null;

  section("Login on a second device");
  const alice2 = new Client("alice-2");
  res = await alice2.post("/api/login", { candidateId: ids[1], pin: "0000" });
  expectError("wrong PIN", res, 401, "WRONG_PIN");
  check("WRONG_PIN message shows remaining tries (7)", /7/.test(res.data?.error?.message ?? ""), res.data?.error?.message);
  res = await alice2.post("/api/login", { candidateId: ids[1], pin: "1111" });
  expectStatus("right PIN", res, 200);
  check("login sets cookie + returns me", alice2.has("tp_voter") && res.data?.me?.id === ids[1] && res.data?.candidate?.id === ids[1], res.data);
  res = await alice2.get("/api/state");
  check("second device is identified", res.data?.me?.id === ids[1] && res.data?.me?.name === "Alice 가람", res.data?.me);
  expectError("login with unknown candidate", await anon.post("/api/login", { candidateId: "nobodyHere123", pin: "1234" }), 404, "NOT_FOUND");
  expectError("login with malformed PIN", await anon.post("/api/login", { candidateId: ids[1], pin: "12" }), 400, "VALIDATION", ["pin"]);
  const forger = new Client("forger");
  forger.setRawCookie("tp_voter", `${ids[1]}.forgedSignatureAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`);
  check("forged voter cookie → anonymous", (await forger.get("/api/state")).data?.me === null);
  expectError("forged cookie cannot vote", await forger.post("/api/vote", { picks: [ids[2], ids[3]] }), 401, "UNAUTHORIZED");

  section("Voting phase rules");
  expectError("vote during registration", await u[1].post("/api/vote", { picks: [ids[2], ids[3]] }), 409, "WRONG_PHASE");
  expectError("vote without cookie", await anon.post("/api/vote", { picks: [ids[2], ids[3]] }), 401, "UNAUTHORIZED");
  res = await admin.post("/api/admin/phase", { phase: "voting" });
  expectStatus("phase → voting", res, 200);
  check("votingStartedAt set, votingClosedAt null", res.data?.phase === "voting" && typeof res.data?.votingStartedAt === "number" && res.data?.votingClosedAt === null, res.data);
  expectError("register during voting", await anon.post("/api/register", registration("Late 지각생", "1234")), 409, "WRONG_PHASE");
  expectError("edit own entry during voting", await u[1].patch("/api/me", { title: "수정 시도" }), 409, "WRONG_PHASE");
  expectError("self vote", await u[1].post("/api/vote", { picks: [ids[1], ids[2]] }), 422, "SELF_VOTE");
  expectError("wrong number of picks", await u[1].post("/api/vote", { picks: [ids[2]] }), 422, "INVALID_PICKS");
  expectError("duplicate picks", await u[1].post("/api/vote", { picks: [ids[2], ids[2]] }), 422, "INVALID_PICKS");
  expectError("unknown candidate id", await u[1].post("/api/vote", { picks: [ids[2], "noSuchPerson99"] }), 422, "INVALID_PICKS");
  expectError("picks is not an array", await u[1].post("/api/vote", { picks: "nope" }), 400, "VALIDATION", ["picks"]);

  section("Casting ballots");
  res = await u[1].post("/api/vote", { picks: [ids[4], ids[2]] });
  check("Alice votes Dave + Bobby", res.status === 200 && sameList(res.data?.me?.picks, [ids[4], ids[2]]) && typeof res.data?.me?.votedAt === "number", res.data);
  expectStatus("Bobby votes Dave + Carol", await u[2].post("/api/vote", { picks: [ids[4], ids[3]] }), 200);
  expectStatus("Carol votes Dave + Bobby", await u[3].post("/api/vote", { picks: [ids[4], ids[2]] }), 200);
  res = await admin.get("/api/admin/state");
  const r1 = res.data?.results?.ranking ?? [];
  check("live ranking: Dave 3 (#1), Bobby 2 (#2), Carol 1 (#3), Alice 0 (#4)",
    sameList(r1.map((e) => `${e.candidateId}:${e.rank}:${e.votes}`), [`${ids[4]}:1:3`, `${ids[2]}:2:2`, `${ids[3]}:3:1`, `${ids[1]}:4:0`]), r1);
  res = await u[1].post("/api/vote", { picks: [ids[2], ids[3]] });
  check("re-vote allowed (allowVoteChange=true)", res.status === 200 && sameList(res.data?.me?.picks, [ids[2], ids[3]]), res.data);
  res = await admin.get("/api/admin/state");
  const results = res.data?.results;
  const r2 = results?.ranking ?? [];
  check("ranking after re-vote: three-way tie (1,1,1) then Alice #4 (competition ranking, name order)",
    sameList(r2.map((e) => `${e.candidateId}:${e.rank}:${e.votes}`), [`${ids[2]}:1:2`, `${ids[3]}:1:2`, `${ids[4]}:1:2`, `${ids[1]}:4:0`]), r2);
  check("totals: 3 ballots, 6 votes, share 2/3, turnout 0.75",
    results?.totalBallots === 3 && results?.totalVotes === 6 && Math.abs((r2[0]?.share ?? 0) - 2 / 3) < 1e-9 && results?.funStats?.turnout === 0.75, results);
  check("fun stats: fastest = Alice (first ballot survives re-vote), most deliberate = Carol, marginTop 2",
    results?.funStats?.fastestVoter?.candidateId === ids[1] && results?.funStats?.mostDeliberateVoter?.candidateId === ids[3] && results?.funStats?.marginTop === 2,
    results?.funStats);
  res = await admin.patch("/api/admin/settings", { allowVoteChange: false });
  check("allowVoteChange → false", res.status === 200 && res.data?.settings?.allowVoteChange === false, res.data?.settings);
  expectError("re-vote when changes are locked", await u[1].post("/api/vote", { picks: [ids[3], ids[4]] }), 409, "ALREADY_VOTED");
  res = await u[1].get("/api/state");
  const flags = Object.fromEntries((res.data?.candidates ?? []).map((c) => [c.id, c.hasVoted]));
  check("public hasVoted flags (Alice, Bobby, Carol ✓ / Dave ✗)", flags[ids[1]] && flags[ids[2]] && flags[ids[3]] && flags[ids[4]] === false, flags);
  check("public results hidden while voting", res.data?.results === null && res.data?.stats?.ballotCount === 3, { results: res.data?.results, stats: res.data?.stats });
  check("me.picks shows my current ballot", sameList(res.data?.me?.picks, [ids[2], ids[3]]), res.data?.me);

  section("Closing & reveal");
  res = await admin.post("/api/admin/phase", { phase: "closed" });
  check("phase → closed sets votingClosedAt", res.status === 200 && res.data?.phase === "closed" && typeof res.data?.votingClosedAt === "number", res.data);
  expectError("vote after closing", await u[4].post("/api/vote", { picks: [ids[1], ids[2]] }), 409, "WRONG_PHASE");
  check("public results still hidden when closed", (await anon.get("/api/state")).data?.results === null);
  expectStatus("phase → revealed", await admin.post("/api/admin/phase", { phase: "revealed" }), 200);
  res = await anon.get("/api/state");
  const pub = res.data?.results;
  check("podium-only public results (Alice with 0 votes hidden)",
    pub?.isFullRanking === false && sameList(pub?.ranking?.map((e) => e.candidateId), [ids[2], ids[3], ids[4]]) && pub?.totalBallots === 3, pub);
  await admin.patch("/api/admin/settings", { showFullRanking: true });
  res = await anon.get("/api/state");
  check("full public ranking when showFullRanking=true",
    res.data?.results?.isFullRanking === true && res.data?.results?.ranking?.length === 4 && res.data?.results?.ranking?.[3]?.candidateId === ids[1], res.data?.results);

  section("Admin tools: edit, PIN reset, rate limit, delete");
  res = await admin.patch(`/api/admin/candidates/${ids[4]}`, { title: "관리자가 고친 제목" });
  check("admin edits a title", res.status === 200 && res.data?.candidates?.find((c) => c.id === ids[4])?.title === "관리자가 고친 제목", res.data?.error);
  expectError("admin rename onto a taken name", await admin.patch(`/api/admin/candidates/${ids[4]}`, { name: "BOBBY 나래" }), 409, "NAME_TAKEN");
  expectError("admin cannot upload images", await admin.patch(`/api/admin/candidates/${ids[4]}`, { image: PNG_URL }), 400, "VALIDATION", ["image"]);
  expectError("admin edit unknown id", await admin.patch("/api/admin/candidates/noSuchPerson99", { title: "x" }), 404, "NOT_FOUND");
  expectError("prototype-ish id: PATCH __proto__", await admin.patch("/api/admin/candidates/__proto__", { title: "x" }), 404, "NOT_FOUND");
  expectError("prototype-ish id: DELETE constructor", await admin.del("/api/admin/candidates/constructor"), 404, "NOT_FOUND");
  expectError("prototype-ish id: reset-pin hasOwnProperty", await admin.post("/api/admin/candidates/hasOwnProperty/reset-pin"), 404, "NOT_FOUND");
  expectError("student cannot use admin endpoints", await u[1].post(`/api/admin/candidates/${ids[4]}/reset-pin`), 401, "UNAUTHORIZED");
  res = await admin.post(`/api/admin/candidates/${ids[4]}/reset-pin`);
  const newPin = res.data?.pin;
  check("reset-pin returns 4 random digits", res.status === 200 && /^\d{4}$/.test(newPin ?? ""), res.data);
  const dave2 = new Client("dave-2");
  if (newPin !== "4444") expectError("old PIN no longer works", await dave2.post("/api/login", { candidateId: ids[4], pin: "4444" }), 401, "WRONG_PIN");
  res = await dave2.post("/api/login", { candidateId: ids[4], pin: newPin });
  check("login with the new PIN", res.status === 200 && res.data?.me?.id === ids[4], res.data);

  const carol2 = new Client("carol-2");
  let lastRemaining = null;
  for (let attempt = 1; attempt <= 7; attempt += 1) {
    res = await carol2.post("/api/login", { candidateId: ids[3], pin: "9999" });
    lastRemaining = res.data?.error?.message;
    if (res.status !== 401) break;
  }
  check("7 wrong PINs → still 401 with 1 try left", res.status === 401 && /1/.test(lastRemaining ?? ""), { status: res.status, lastRemaining });
  expectError("8th wrong PIN → locked", await carol2.post("/api/login", { candidateId: ids[3], pin: "9999" }), 429, "RATE_LIMITED");
  expectError("even the right PIN is locked out", await carol2.post("/api/login", { candidateId: ids[3], pin: "3333" }), 429, "RATE_LIMITED");
  res = await admin.post(`/api/admin/candidates/${ids[3]}/reset-pin`);
  res = await carol2.post("/api/login", { candidateId: ids[3], pin: res.data?.pin });
  check("admin PIN reset lifts the lockout", res.status === 200 && res.data?.me?.id === ids[3], res.data);

  res = await admin.del(`/api/admin/candidates/${ids[2]}`);
  expectStatus("delete Bobby", res, 200);
  const afterDelete = res.data?.results;
  check("Bobby is gone and his ballot no longer counts",
    !res.data?.candidates?.some((c) => c.id === ids[2]) && afterDelete?.totalBallots === 2 && afterDelete?.totalVotes === 2, afterDelete);
  check("tallies recomputed: Carol 1, Dave 1 (tied #1), Alice 0 (#3)",
    sameList(afterDelete?.ranking?.map((e) => `${e.candidateId}:${e.rank}:${e.votes}`), [`${ids[3]}:1:1`, `${ids[4]}:1:1`, `${ids[1]}:3:0`]), afterDelete?.ranking);
  check("Bobby's cookie is now anonymous", (await u[2].get("/api/state")).data?.me === null);
  expectError("delete again", await admin.del(`/api/admin/candidates/${ids[2]}`), 404, "NOT_FOUND");

  section("Demo seed");
  expectError("seed count out of range", await admin.post("/api/admin/seed", { count: 99 }), 400, "VALIDATION", ["count"]);
  const before = await admin.get("/api/admin/state");
  res = await admin.post("/api/admin/seed", { count: 5, withBallots: true });
  check("seed adds 5 demo participants and 4 ballots", res.status === 200 && res.data?.added === 5 && res.data?.ballots === 4, res.data);
  const seeded = await admin.get("/api/admin/state");
  const realIds = new Set([ids[1], ids[3], ids[4]]);
  const demoCandidates = (seeded.data?.candidates ?? []).filter((c) => !realIds.has(c.id));
  check("8 participants, 6 ballots", seeded.data?.stats?.candidateCount === 8 && seeded.data?.stats?.ballotCount === 6, seeded.data?.stats);
  const realVoted = (state) => Object.fromEntries((state.data?.candidates ?? []).filter((c) => realIds.has(c.id)).map((c) => [c.id, c.hasVoted]));
  check("real participants' ballots untouched (Dave still has not voted)", JSON.stringify(realVoted(before)) === JSON.stringify(realVoted(seeded)) && realVoted(seeded)[ids[4]] === false, realVoted(seeded));
  check("demo warning shown to admin", (seeded.data?.warnings ?? []).some((w) => /데모/.test(w.message)), seeded.data?.warnings);
  const shot = demoCandidates[0]?.imageUrl;
  res = shot ? await anon.get(shot) : { status: 0, headers: new Headers() };
  check("seed screenshot is an SVG with a strict CSP", res.status === 200 && res.headers.get("content-type") === "image/svg+xml" &&
    /default-src 'none'/.test(res.headers.get("content-security-policy") || ""), { status: res.status, type: res.headers.get("content-type") });
  check("seed SVG has no script", res.bytes?.toString("utf8").includes("<svg") && !/<script/i.test(res.bytes?.toString("utf8") ?? ""));
  const demoLogin = await new Client("demo").post("/api/login", { candidateId: demoCandidates[0]?.id, pin: "0000" });
  expectStatus("demo participant logs in with PIN 0000", demoLogin, 200);

  section("Locked ballots after a deletion");
  expectStatus("phase → voting again", await admin.post("/api/admin/phase", { phase: "voting" }), 200);
  res = await alice2.post("/api/vote", { picks: [ids[3], ids[4]] });
  check("Alice lost a ticket (Bobby deleted) → may re-vote despite the lock", res.status === 200 && sameList(res.data?.me?.picks, [ids[3], ids[4]]), res.data);
  expectError("…but only once her ballot is complete again", await alice2.post("/api/vote", { picks: [ids[3], demoCandidates[0]?.id] }), 409, "ALREADY_VOTED");
  res = await dave2.post("/api/vote", { picks: [ids[1], ids[3]] });
  check("a first ballot is always allowed when changes are locked (Dave)", res.status === 200 && sameList(res.data?.me?.picks, [ids[1], ids[3]]), res.data);
  expectStatus("phase → closed", await admin.post("/api/admin/phase", { phase: "closed" }), 200);

  section("Reset ballots / reset all / logout");
  res = await admin.post("/api/admin/reset", { scope: "ballots", confirm: "초기화" });
  check("reset ballots → 0 ballots, vote timestamps cleared", res.status === 200 && res.data?.stats?.ballotCount === 0 && res.data?.results?.totalBallots === 0 &&
    res.data?.votingStartedAt === null && res.data?.votingClosedAt === null && res.data?.candidates?.length === 8, res.data?.stats);
  res = await admin.post("/api/admin/reset", { scope: "all", confirm: "초기화" });
  check("reset all → registration, nobody left, settings kept",
    res.status === 200 && res.data?.phase === "registration" && res.data?.candidates?.length === 0 && res.data?.settings?.showFullRanking === true && res.data?.settings?.allowVoteChange === false, res.data);
  check("old cookies become anonymous after reset", (await alice2.get("/api/state")).data?.me === null);
  expectError("seed images removed by reset", shot ? await anon.get(shot) : { status: 404, data: { error: { code: "NOT_FOUND", message: "x" } } }, 404, "NOT_FOUND");
  res = await admin.patch("/api/admin/settings", { eventTitle: "1인 해커톤 데모데이", votesPerVoter: 2, allowVoteChange: true, showFullRanking: false });
  expectStatus("restore default settings", res, 200);
  res = await alice2.post("/api/logout");
  check("logout clears the voter cookie", res.status === 200 && res.data?.ok === true && !alice2.has("tp_voter"), res.headers.get("set-cookie"));
  res = await admin.post("/api/admin/logout");
  check("admin logout clears the admin cookie", res.status === 200 && !admin.has("tp_admin"), res.headers.get("set-cookie"));
  expectError("admin state after logout", await admin.get("/api/admin/state"), 401, "UNAUTHORIZED");
}

const started = Date.now();
try {
  await main();
} catch (err) {
  failures.push(`crashed: ${err instanceof Error ? err.message : String(err)}`);
  console.log(`\n  ✗ smoke test crashed: ${err instanceof Error ? err.stack : String(err)}`);
}
const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(`\n${failures.length === 0 ? "✅" : "❌"} ${passed} passed, ${failures.length} failed (${seconds}s)`);
if (failures.length > 0) {
  for (const label of failures) console.log(`   ✗ ${label}`);
  process.exitCode = 1;
}
