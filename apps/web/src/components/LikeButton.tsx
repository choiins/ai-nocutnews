"use client";
import { useLikes } from "@/lib/likes";

// 모바일 카드(전체가 <a>)·기타 곳에서 쓰는 작은 좋아요 토글 버튼.
// 카드 링크 안에 들어가므로 클릭 시 내비게이션을 막는다.
const ThumbUp = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10v11" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
);

export default function LikeButton({ id, showLabel = false }: { id: number; showLabel?: boolean }) {
  const { has, toggle, ready } = useLikes();
  const on = ready && has(id);
  return (
    <button
      type="button"
      className={`like-btn${on ? " on" : ""}`}
      aria-pressed={on}
      aria-label={on ? "좋아요 취소" : "좋아요"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
    >
      {ThumbUp}
      {showLabel && <span>{on ? "좋아요됨" : "좋아요"}</span>}
    </button>
  );
}
