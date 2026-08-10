// 표시용 제목 가공 — 원문(DB의 title)은 보존하고 화면에 그릴 때만 다듬는다.
//  1) 맨 앞 [코너명] 대괄호 접두어 제거. 단, [단독]·[속보]는 남긴다.
//     "[영상][단독] …" 처럼 연달아 붙은 경우, 유지 대상([단독])을 만나면 멈춘다.
//  2) 45자를 넘으면 말줄임(…)으로 축약.

const KEEP = ["단독", "속보"]; // 이 대괄호 접두어는 제거하지 않는다

const LEADING_BRACKET = /^\s*\[([^\]]*)\]\s*/;

export function displayTitle(raw: string | null | undefined, maxLen = 45): string {
  let s = (raw ?? "").trim();

  // 맨 앞 대괄호 접두어를 하나씩 검사 — 유지 대상이면 멈추고, 아니면 제거.
  let m: RegExpMatchArray | null;
  while ((m = s.match(LEADING_BRACKET))) {
    const inner = m[1].trim();
    if (KEEP.includes(inner)) break;
    s = s.slice(m[0].length);
  }
  s = s.trim();

  if (s.length > maxLen) {
    s = s.slice(0, maxLen).trimEnd() + "…";
  }
  return s;
}
