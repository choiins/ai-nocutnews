// 피드용 시간 표기 — 한국시간(KST) 기준.
// 1시간 이내: "방금 전 / n분 전", 오늘: "HH:MM", 그 이전: "M월 D일".
// 서버(UTC)에서 렌더되어도 timeZone을 명시해 항상 KST로 보이도록 한다.
const KST = "Asia/Seoul";
const dayOf = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: KST });

export function feedTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (dayOf(then) === dayOf(Date.now())) {
    return new Date(then).toLocaleTimeString("ko-KR", {
      hour: "2-digit", minute: "2-digit", hour12: false, timeZone: KST,
    });
  }
  return new Date(then).toLocaleDateString("ko-KR", { month: "long", day: "numeric", timeZone: KST });
}
