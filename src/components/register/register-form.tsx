"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ProjectCard } from "@/components/brand/project-card";
import { api, getFieldErrors, isApiError, toastError } from "@/lib/api-client";
import { EMOJIS, LIMITS } from "@/lib/constants";
import { COLOR_KEYS, type ColorKey, type MeResponse, type PublicCandidate } from "@/lib/types";
import { cn, isHttpUrl } from "@/lib/utils";
import { ImagePicker } from "./image-picker";
import { LoginPanel } from "./login-panel";
import { AvatarPicker, btnPrimary, btnSecondary, Field, inputCls, PinInput } from "./ui";

type Errors = Partial<Record<"name" | "title" | "description" | "link" | "pin" | "image" | "emoji" | "color", string>>;

function normalizeLink(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
}

export function RegisterForm({
  initial,
  candidates,
  nextEntryNo,
  onRegistered,
  onSaved,
  onLogout,
  refresh,
}: {
  /** Present → edit mode. */
  initial: PublicCandidate | null;
  candidates: PublicCandidate[];
  nextEntryNo: number;
  onRegistered: (res: MeResponse, pin: string) => void;
  onSaved: () => void;
  onLogout: () => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const edit = initial !== null;
  const [name, setName] = useState(initial?.name ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [emoji, setEmoji] = useState<string>(initial?.emoji ?? EMOJIS[0]);
  const [color, setColor] = useState<ColorKey>(initial?.color ?? "yellow");
  const [pin, setPin] = useState("");
  const [image, setImage] = useState<string | null>(initial?.imageUrl ?? null);
  const [imageDirty, setImageDirty] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loginKey, setLoginKey] = useState<string | null>(null);

  const clear = (k: keyof Errors) => setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));

  const descLen = description.length;
  const descRatio = descLen / LIMITS.description.max;

  const preview: PublicCandidate = {
    id: initial?.id ?? "preview",
    name: name.trim() || "내 이름",
    title: title.trim() || "프로젝트 이름이 여기에",
    description: description.trim() || "소개가 여기에 들어가요. 짧고 굵게! ✍️",
    link: normalizeLink(link),
    emoji,
    color,
    imageUrl: image,
    entryNo: initial?.entryNo ?? nextEntryNo,
    createdAt: initial?.createdAt ?? 0,
    updatedAt: initial?.updatedAt ?? 0,
    hasVoted: false,
  };

  function validate(): Errors {
    const e: Errors = {};
    if (!name.trim()) e.name = "이름이 비었어요. 친구들이 찾을 수 있게 적어주세요";
    if (!title.trim()) e.title = "프로젝트 이름을 지어주세요 (가제도 OK)";
    if (!description.trim()) e.description = "한 줄이라도 자랑해 주세요 🎤";
    const l = normalizeLink(link);
    if (l && !isHttpUrl(l)) e.link = "http:// 또는 https:// 링크만 받을 수 있어요";
    if (!edit && !new RegExp(`^\\d{${LIMITS.pinLength}}$`).test(pin)) e.pin = "PIN은 숫자 4자리로 정해주세요";
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (imageBusy) return toast.info("이미지 다이어트가 끝날 때까지 잠깐만요 🏃");
    const local = validate();
    setErrors(local);
    if (Object.keys(local).length > 0) {
      toast.error("빨간 칸을 확인해 주세요 👀");
      return;
    }
    setSubmitting(true);
    try {
      const base = {
        name: name.trim(),
        title: title.trim(),
        description: description.trim(),
        link: normalizeLink(link),
        emoji,
        color,
      };
      if (edit) {
        await api.updateMe({ ...base, image: imageDirty ? image : undefined });
        await refresh();
        setImageDirty(false);
        toast.success("수정 완료! 더 멋있어졌어요 ✨");
        onSaved();
      } else {
        const res = await api.register({ ...base, pin, image });
        await refresh();
        onRegistered(res, pin);
      }
    } catch (err) {
      const fe = getFieldErrors(err) as Errors;
      if (isApiError(err, "NAME_TAKEN")) {
        setErrors({ ...fe, name: err.message || "이미 같은 이름이 있어요" });
        const match = candidates.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (match && !edit) setLoginKey(match.id);
        toast.error("이미 있는 이름이에요. 혹시 본인이라면 아래에서 로그인! 👇");
      } else if (Object.keys(fe).length > 0) {
        setErrors(fe);
        toastError(err, { title: "빨간 칸을 확인해 주세요 👀" });
      } else {
        toastError(err);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function randomize() {
    setEmoji(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
    setColor(COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)]);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start">
      <form onSubmit={onSubmit} noValidate className={cn(panelLike, "space-y-6")}>
        {edit ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-field border-2 border-ink bg-mint/25 px-4 py-3">
            <p className="text-sm font-bold text-ink">✏️ 내 작품 수정 중 — 투표 시작 전까지 얼마든지 고칠 수 있어요</p>
            <button type="button" onClick={() => void onLogout()} className={btnSecondary}>
              🙋 다른 사람으로 등록하기
            </button>
          </div>
        ) : null}

        <Field id="reg-name" label="이름" hint="본명 추천! 친구들이 투표할 때 찾아야 하니까요" error={errors.name}>
          <input
            id="reg-name"
            value={name}
            maxLength={LIMITS.name.max}
            autoComplete="name"
            placeholder="예) 김투픽"
            onChange={(e) => (setName(e.target.value), clear("name"))}
            aria-invalid={!!errors.name || undefined}
            className={cn(inputCls, errors.name && "border-danger")}
          />
        </Field>

        <Field id="reg-title" label="프로젝트 이름" error={errors.title} hint="한눈에 꽂히는 이름이면 반은 먹고 들어가요">
          <input
            id="reg-title"
            value={title}
            maxLength={LIMITS.title.max}
            placeholder="예) 점심 룰렛 3000"
            onChange={(e) => (setTitle(e.target.value), clear("title"))}
            aria-invalid={!!errors.title || undefined}
            className={cn(inputCls, errors.title && "border-danger")}
          />
        </Field>

        <Field
          id="reg-desc"
          label="소개"
          error={errors.description}
          hint={
            descRatio >= 1 ? "여기까지! 나머지는 발표에서 🎤" : descRatio >= 0.8 ? "슬슬 TMI 구간 🚧" : "자랑은 짧고 굵게"
          }
          aside={
            <span
              className={cn(
                "rounded-chip border-2 border-ink px-2 py-0.5 font-mono text-xs font-bold",
                descRatio >= 1 ? "bg-pop text-card" : descRatio >= 0.8 ? "bg-ticket text-ink" : "bg-card text-muted",
              )}
              aria-live="polite"
            >
              {descLen}/{LIMITS.description.max}
            </span>
          }
        >
          <textarea
            id="reg-desc"
            value={description}
            rows={4}
            maxLength={LIMITS.description.max}
            placeholder="예) 점심 메뉴 고르느라 30분 쓰는 당신을 위한 3초 룰렛"
            onChange={(e) => (setDescription(e.target.value), clear("description"))}
            aria-invalid={!!errors.description || undefined}
            className={cn(inputCls, "resize-y leading-relaxed", errors.description && "border-danger")}
          />
        </Field>

        <Field id="reg-link" label="데모 링크" optional error={errors.link} hint="배포 주소가 있으면 심사위원(=친구들)이 직접 눌러봐요">
          <input
            id="reg-link"
            type="url"
            inputMode="url"
            value={link}
            maxLength={LIMITS.link.max}
            placeholder="https://my-project.vercel.app"
            onChange={(e) => (setLink(e.target.value), clear("link"))}
            aria-invalid={!!errors.link || undefined}
            className={cn(inputCls, "font-mono text-sm", errors.link && "border-danger")}
          />
        </Field>

        <Field label="스크린샷" optional error={errors.image} hint="이미지는 자동으로 가볍게 줄여서 올려요">
          <ImagePicker
            value={image}
            invalid={!!errors.image}
            disabled={submitting}
            onBusyChange={setImageBusy}
            onChange={(v) => {
              setImage(v);
              setImageDirty(true);
              clear("image");
            }}
          />
        </Field>

        <Field label="아바타" error={errors.emoji ?? errors.color} hint="투표 화면에서 나를 대표할 얼굴이에요">
          <AvatarPicker emoji={emoji} color={color} onEmoji={setEmoji} onColor={setColor} onRandom={randomize} />
        </Field>

        {edit ? (
          <p className="rounded-field border-2 border-dashed border-ink/40 px-4 py-3 text-sm text-muted">
            🔒 PIN은 바꿀 수 없어요. 잊었다면 관리자에게 조용히 손 들기 🙋
          </p>
        ) : (
          <Field id="reg-pin" label="PIN 4자리" hint="투표할 때 필요해요. 생일은 너무 뻔해요 🙊" error={errors.pin}>
            <PinInput id="reg-pin" value={pin} onChange={(v) => (setPin(v), clear("pin"))} invalid={!!errors.pin} />
          </Field>
        )}

        <button type="submit" disabled={submitting || imageBusy} className={cn(btnPrimary, "w-full")}>
          {submitting ? "티켓 인쇄 중… 🎟️" : imageBusy ? "이미지 다이어트 중… 🏃" : edit ? "💾 수정 저장하기" : "🎟️ 참가 등록하기"}
        </button>

        {!edit ? (
          <LoginPanel
            key={loginKey ?? "login"}
            candidates={candidates}
            onDone={refresh}
            defaultOpen={loginKey !== null}
            defaultCandidateId={loginKey ?? ""}
          />
        ) : null}
      </form>

      <aside className="space-y-3 lg:sticky lg:top-24">
        <p className="flex items-center gap-2 font-display text-lg text-ink">
          <span className="inline-block size-2.5 animate-blink rounded-full bg-pop" aria-hidden />
          실시간 미리보기
        </p>
        <ProjectCard candidate={preview} />
        <p className="text-center text-sm text-muted">친구들 화면엔 이렇게 보여요 👀</p>
      </aside>
    </div>
  );
}

const panelLike = "rounded-card border-2 border-ink bg-card p-5 shadow-brutal-md sm:p-7";
