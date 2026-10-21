import "server-only";

/** Demo participants for the admin "데모 데이터 넣기 🧪" tool. Names are dev puns, projects are fake. */

export type ShotLayout = "landing" | "dashboard" | "mobile";

export interface DemoProfile {
  name: string;
  title: string;
  description: string;
  /** Short line printed inside the fake screenshot. */
  tagline: string;
  layout: ShotLayout;
}

export const DEMO_PROFILES: readonly DemoProfile[] = [
  {
    name: "김코딩",
    title: "오늘 뭐 먹지? 3초 점심 룰렛",
    description: "점심 메뉴 고르느라 30분 쓰는 당신을 위한 3초 룰렛. 결과에 불복하면 딱 한 번 더 돌릴 수 있어요. (두 번은 안 돼요)",
    tagline: "오늘의 메뉴는… 🍜",
    layout: "mobile",
  },
  {
    name: "이디버그",
    title: "버그 잡는 고양이",
    description: "콘솔 에러를 고양이가 대신 읽어주는 크롬 확장 프로그램. 냥 소리가 길수록 심각한 버그예요.",
    tagline: "에러 3개 발견! 냐아앙",
    layout: "dashboard",
  },
  {
    name: "박커밋",
    title: "커밋 메시지 작명소",
    description: "'fix', 'asdf', '최종_진짜최종'은 이제 그만. 변경 내용을 넣으면 그럴듯한 커밋 메시지를 지어줘요.",
    tagline: "feat: 인생 리팩토링",
    layout: "landing",
  },
  {
    name: "최배포",
    title: "금요일 배포 방지턱",
    description: "금요일 오후 5시 이후에 배포 버튼을 누르면 세 번 되묻는 서비스. 당신의 주말을 지켜드려요.",
    tagline: "정말요? 오늘 금요일인데요?",
    layout: "landing",
  },
  {
    name: "정리액트",
    title: "리액트 훅 타로",
    description: "오늘의 운세를 useEffect로 점쳐드려요. 의존성 배열을 빼먹으면 운세가 무한 루프를 돕니다.",
    tagline: "오늘의 카드: useMemo 🔮",
    layout: "mobile",
  },
  {
    name: "강타입",
    title: "any 잔소리꾼",
    description: "any를 쓸 때마다 엄마 목소리로 잔소리해주는 VS Code 확장. 효과는 확실합니다.",
    tagline: "이번 주 any 사용 0회 달성!",
    layout: "dashboard",
  },
  {
    name: "윤서버",
    title: "서버 상태 무드등",
    description: "서버가 아프면 방 조명이 빨갛게 변해요. 새벽 3시 장애 알림, 이제 눈으로 느끼세요.",
    tagline: "모든 서버 정상 💚",
    layout: "dashboard",
  },
  {
    name: "한깃헙",
    title: "잔디 심기 도우미",
    description: "깃허브 잔디가 비는 날 다정하게 알려주는 알림봇. 하루 한 커밋, 건강한 잔디밭.",
    tagline: "연속 커밋 42일째 🌱",
    layout: "dashboard",
  },
  {
    name: "조픽셀",
    title: "1px 칭찬 감별사",
    description: "디자인 시안을 올리면 1px 차이까지 찾아내고, 칭찬 3개와 개선점 1개를 알려줘요.",
    tagline: "여백이 아주 예술이에요 ✨",
    layout: "landing",
  },
  {
    name: "신오류",
    title: "404 맛집 지도",
    description: "학교 근처 맛집을 지도에 모았어요. 문 닫은 가게는 404로 표시해서 헛걸음을 막아줘요.",
    tagline: "지금 영업 중 12곳 📍",
    layout: "mobile",
  },
  {
    name: "임스택",
    title: "스택오버플로 선배 번역기",
    description: "영어 답변을 '친절한 선배 말투'로 번역해줘요. \"이거 그냥 이렇게 하면 됨 ㅇㅇ\"",
    tagline: "선배, 이거 왜 돼요?",
    layout: "landing",
  },
  {
    name: "서콘솔",
    title: "3초 출석 체크",
    description: "강의실 입구 QR 한 번이면 출석 끝. 지각 3분 전엔 응원 메시지도 보내드려요.",
    tagline: "출석 완료! 오늘도 화이팅 💪",
    layout: "mobile",
  },
  {
    name: "문함수",
    title: "과제 마감 라면 타이머",
    description: "과제 마감까지 남은 시간을 라면 끓이는 횟수로 알려줘요. '라면 4봉지 남았습니다.'",
    tagline: "라면 4봉지 남음 🍜",
    layout: "mobile",
  },
  {
    name: "장깃",
    title: "회의록 세 줄 요약봇",
    description: "1시간 회의를 세 줄로 요약하고, 누가 '그건 좀…'을 몇 번 말했는지도 세어줘요.",
    tagline: "오늘의 '그건 좀…' 7회",
    layout: "dashboard",
  },
  {
    name: "권변수",
    title: "변수명 작명소",
    description: "data, temp, a1 대신 의미 있는 변수명을 추천해줘요. 개발자 최대 난제, 이제 3초 컷.",
    tagline: "const 행복 = true",
    layout: "landing",
  },
  {
    name: "송루프",
    title: "무한 스크롤 탈출기",
    description: "숏폼을 30분 넘게 보면 화면이 서서히 흑백으로 변해요. 정신 차려, 과제 해야지!",
    tagline: "오늘 스크롤 2.3km 🏃",
    layout: "mobile",
  },
  {
    name: "황배열",
    title: "기숙사 빨래 알리미",
    description: "세탁기 남은 시간을 공유하는 서비스. 빨래 방치범에게는 정중한 알림이 3단계로 갑니다.",
    tagline: "3번 세탁기 12분 남음 🧺",
    layout: "mobile",
  },
  {
    name: "안쿼리",
    title: "스터디 짝꿍 매칭",
    description: "공부 스타일 MBTI로 스터디 짝꿍을 찾아줘요. 'J형 계획러가 P형 즉흥러를 구합니다.'",
    tagline: "매칭률 97% 🤝",
    layout: "landing",
  },
  {
    name: "유컴포넌트",
    title: "죄책감 식단 일기",
    description: "먹은 걸 사진으로 찍으면 칼로리 대신 '죄책감 지수'를 알려주는 식단 일기장.",
    tagline: "오늘 죄책감 지수 23%",
    layout: "mobile",
  },
  {
    name: "전캐시",
    title: "전공책 물물교환소",
    description: "다 본 전공책을 학과 친구와 바꿔요. 형광펜이 많이 칠해진 책일수록 인기가 많아요.",
    tagline: "교환 성사 128건 📚",
    layout: "landing",
  },
  {
    name: "홍라우터",
    title: "동아리 공연 좌석 예매",
    description: "줄 서지 말고 좌석을 고르세요. 앞자리 쟁탈전은 3초 컷.",
    tagline: "잔여 좌석 17석 🎸",
    layout: "dashboard",
  },
  {
    name: "고프롬프트",
    title: "자소서 질문 코치",
    description: "자소서를 넣으면 '성실함' 같은 단어 대신 진짜 경험을 끌어내는 질문을 던져줘요.",
    tagline: "그때 기분이 어땠나요?",
    layout: "landing",
  },
  {
    name: "노디비",
    title: "우리 반 초간단 투표",
    description: "점심 메뉴부터 MT 장소까지, 링크 하나로 끝나는 초간단 투표. 어디서 본 것 같다면 기분 탓이에요.",
    tagline: "지금 투표 중 🗳️",
    layout: "mobile",
  },
  {
    name: "류웹팩",
    title: "반려식물 물주기 알림",
    description: "식물 사진을 올리면 물 줄 타이밍을 알려줘요. 벌써 선인장 세 개를 살렸어요.",
    tagline: "몬스테라가 목말라요 💧",
    layout: "mobile",
  },
  {
    name: "배비동기",
    title: "뛰어도 되는 버스 판정기",
    description: "정류장까지 거리와 버스 도착 시간을 계산해서 '뛰면 탄다 / 걸어도 놓친다'를 판정해줘요.",
    tagline: "지금 뛰면 탑니다! 🏃",
    layout: "mobile",
  },
  {
    name: "백엔드",
    title: "현실 퇴근 시간 계산기",
    description: "오늘 할 일을 입력하면 현실적인 퇴근 시간을 계산해줘요. 대체로 슬픈 결과가 나옵니다.",
    tagline: "예상 퇴근 23:40 🥲",
    layout: "dashboard",
  },
  {
    name: "남프론트",
    title: "다크모드 강제 전환기",
    description: "눈부신 사이트를 만나면 자동으로 다크모드로 바꿔주는 확장 프로그램. 새벽 코딩러의 눈을 지켜요.",
    tagline: "눈 건강 +100 🕶️",
    layout: "landing",
  },
  {
    name: "표린트",
    title: "코드 리뷰 칭찬 스티커",
    description: "코드 리뷰에 칭찬 스티커를 붙여줘요. 'LGTM' 대신 '이 함수 예술이다 🎨'",
    tagline: "이번 주 칭찬 스티커 56장",
    layout: "dashboard",
  },
  {
    name: "염도커",
    title: "날씨 플레이리스트 DJ",
    description: "지금 날씨와 기분에 맞춰 플레이리스트를 골라줘요. 비 오는 날엔 역시 lo-fi.",
    tagline: "비 오는 날 lo-fi 🌧️",
    layout: "mobile",
  },
  {
    name: "차세션",
    title: "냉장고 파먹기 레시피",
    description: "냉장고 속 재료 세 개만 넣으면 오늘의 레시피 완성. 계란은 거의 항상 등장합니다.",
    tagline: "오늘은 계란볶음밥 🍳",
    layout: "landing",
  },
];
