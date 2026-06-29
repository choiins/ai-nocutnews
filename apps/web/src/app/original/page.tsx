import { getArticles } from "@/lib/data";
import EmptyState from "@/components/EmptyState";
import { feedTime } from "@/lib/time";

export const revalidate = 300;

export default async function OriginalFeed() {
  const articles = await getArticles();
  if (articles.length === 0) {
    return <main><EmptyState message="아직 표시할 기사가 없습니다. 수집 파이프라인이 채워지면 원문이 여기에 나타납니다." /></main>;
  }

  return (
    <main>
      <div className="stream">
        {articles.map((a) => (
          <div className="story" key={a.id}>
            <a className="card" href={`/article/${a.id}`}>
              <div className="kicker">{feedTime(a.published_at)}</div>
              <div className="card-title">{a.title}</div>
              {a.thumbnail_url && <img className="thumb" src={a.thumbnail_url} alt="" loading="lazy" />}
              {a.body_full && (
                <p className="summary" style={{ display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {a.body_full}
                </p>
              )}
              <span style={{ display: "inline-block", marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1, color: "var(--accent-secondary)" }}>
                노컷 원문 전체 보기 →
              </span>
            </a>
          </div>
        ))}
      </div>
    </main>
  );
}
