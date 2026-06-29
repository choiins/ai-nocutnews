"use client";
import { useEffect, useRef, useState } from "react";
import type { Article } from "@shared/types";

// JoongAng "1min" 스타일 데스크톱 리더.
// 가운데: 요약 기사 카드가 기존 방식대로 쭉 흐른다(연속 피드).
// 오른쪽: 가벼운 제목 인덱스 — 클릭하면 해당 기사로 스크롤(모바일 숨김).
// 스크롤 중 화면 중앙에 온 기사가 "지금 보는 기사"로 표시되며 그라데이션 테두리가 돈다.

function fmtDate(iso: string): string {
  // 한국시간(KST) 고정 — 서버(UTC) 렌더에서도 어긋나지 않게.
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul",
  });
}

const ThumbUp = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10v11" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
);
const ShareIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

export default function DesktopReader({ articles }: { articles: Article[] }) {
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState("");
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("liked");
      if (raw) setLiked(JSON.parse(raw));
    } catch {}
  }, []);

  // 화면 중앙에 들어온 기사를 활성으로 — 그라데이션 테두리 + 사이드 하이라이트
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.idx));
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    cardRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [articles.length]);

  // 스크롤 다운 시 카드가 한 번씩 떠오르는 등장 효과
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setRevealed((prev) => {
              if (prev[idx]) return prev;
              const next = [...prev];
              next[idx] = true;
              return next;
            });
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    cardRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [articles.length]);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 1800);
  };

  const toggleLike = (id: number) => {
    setLiked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem("liked", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const share = async (a: Article) => {
    const url = `${location.origin}/article/${a.id}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("링크를 복사했어요");
    } catch {
      flash("복사에 실패했어요");
    }
  };

  const scrollTo = (i: number) => {
    setActive(i);
    cardRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="pc-reader">
      <div className="pc-wrap pc-grid">
        {/* ---------- 가운데: 요약 기사 연속 피드 ---------- */}
        <main className="pc-main">
          {articles.map((a, i) => {
            // 본문은 압축된 3문장을 불렛으로 — 요약문을 문장 단위로 끊어 핵심만 보여준다.
            const points = (a.summary_short || "")
              .split(/(?<=[.!?])\s+/)
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 3);
            const bullets = points.length > 0 ? points : (a.summary_bullets ?? []);
            return (
            <article
              key={a.id}
              data-idx={i}
              ref={(el) => { cardRefs.current[i] = el; }}
              className={`jc-card${revealed[i] ? " revealed" : ""}${i === active ? " active" : ""}`}
            >
              <div className="jc-head">
                <h1 className="jc-title">{a.ai_headline || a.title}</h1>
                {a.thumbnail_url && <img className="jc-thumb" src={a.thumbnail_url} alt="" />}
              </div>
              <div className="jc-meta">노컷뉴스 · 입력 {fmtDate(a.published_at)}</div>

              <div className="jc-body">
                {bullets.length > 0 && (
                  <ul className="jc-bullets">
                    {bullets.map((b, k) => <li key={k}>{b}</li>)}
                  </ul>
                )}
              </div>

              <div className="jc-actions">
                <button
                  className={`jc-act${liked[a.id] ? " on" : ""}`}
                  onClick={() => toggleLike(a.id)}
                  aria-pressed={!!liked[a.id]}
                >
                  {ThumbUp}<span>좋아요</span>
                </button>
                <button className="jc-act" onClick={() => share(a)}>
                  {ShareIcon}<span>공유</span>
                </button>
                <a className="jc-original" href={a.original_url} target="_blank" rel="noopener noreferrer">
                  원문보기 <span aria-hidden>›</span>
                </a>
              </div>
            </article>
            );
          })}
        </main>

        {/* ---------- 오른쪽: 가벼운 제목 인덱스 (모바일 숨김) ---------- */}
        <aside className="pc-side">
          <div className="pc-side-head">전체기사</div>
          <ul className="pc-list">
            {articles.map((it, i) => (
              <li key={it.id}>
                <button
                  className={`pc-list-item${i === active ? " on" : ""}`}
                  onClick={() => scrollTo(i)}
                >
                  <span>{it.ai_headline || it.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {toast && <div className="pc-toast">{toast}</div>}
    </div>
  );
}
