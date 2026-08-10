"use client";
import { useState, useEffect } from "react";
import { useSession } from "@/lib/session";
import { useLikes } from "@/lib/likes";
import { getArticlesByIds } from "@/lib/data";
import { getRelatedArticles, type FeedItem } from "@/lib/topics";
import { feedTime } from "@/lib/time";
import type { Article } from "@shared/types";

function FeedList({ feed }: { feed: FeedItem[] }) {
  return (
    <div className="stream">
      {feed.map(({ article: a, matched }) => (
        <div className="story" key={a.id}>
          <a className="card" href={`/article/${a.id}`}>
            <div className="kicker">{feedTime(a.published_at)}</div>
            <div className="card-title">{a.ai_headline || a.title}</div>
            {a.summary_short && <p className="summary">{a.summary_short}</p>}
            <div className="match-chips">
              {matched.map((m) => (
                <span key={m} className="match-chip">#{m}</span>
              ))}
            </div>
          </a>
        </div>
      ))}
    </div>
  );
}

export default function SavedLikesPage() {
  const { ready: sessionReady } = useSession();
  const { ids: likedIds, toggle: toggleLike, ready: likesReady } = useLikes();

  const [likedArticles, setLikedArticles] = useState<Article[]>([]);
  const [related, setRelated] = useState<FeedItem[]>([]);

  useEffect(() => {
    if (!likesReady) return;
    let alive = true;
    getArticlesByIds(likedIds).then((a) => { if (alive) setLikedArticles(a); });
    getRelatedArticles(likedIds).then((r) => { if (alive) setRelated(r); });
    return () => { alive = false; };
  }, [likesReady, likedIds]);

  if (!sessionReady) return <main />;

  return (
    <main>
      <a className="back-link" href="/like">← 관심사·맞춤 피드로</a>

      {/* ---------- 좋아요한 기사 ---------- */}
      <section className="like-block">
        <div className="side-head">좋아요한 기사</div>
        {!likesReady ? (
          <p className="like-hint">불러오는 중…</p>
        ) : likedArticles.length === 0 ? (
          <p className="like-hint">Short 피드에서 ♥ 좋아요를 누르면 여기에 모여요.</p>
        ) : (
          <div className="stream">
            {likedArticles.map((a) => (
              <div className="story" key={a.id}>
                <a className="card" href={`/article/${a.id}`}>
                  <div className="kicker">{feedTime(a.published_at)}</div>
                  <div className="card-title">{a.ai_headline || a.title}</div>
                  {a.summary_short && <p className="summary">{a.summary_short}</p>}
                </a>
                <button
                  className="liked-remove"
                  aria-label="좋아요 취소"
                  onClick={() => toggleLike(a.id)}
                >
                  ♥ 좋아요 취소
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- 좋아요 기반 관련 기사 ---------- */}
      {related.length > 0 && (
        <section className="like-block">
          <div className="side-head">좋아요한 주제의 다른 기사</div>
          <FeedList feed={related} />
        </section>
      )}
    </main>
  );
}
