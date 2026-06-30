import { getArticles } from "@/lib/data";
import DesktopReader from "@/components/DesktopReader";
import LikeButton from "@/components/LikeButton";
import { feedTime } from "@/lib/time";

export const revalidate = 300; // ISR: 5분마다 재생성

export default async function ShortFeed() {
  const articles = await getArticles();

  if (articles.length === 0) {
    return (
      <main>
        <p style={{ color: "var(--text-secondary)", padding: "40px 0" }}>
          아직 표시할 기사가 없습니다. 수집 파이프라인이 데이터를 채우면 여기에 나타납니다.
        </p>
      </main>
    );
  }

  return (
    <>
    {/* 데스크톱 — JoongAng 1min 스타일 리더 (≥1024px) */}
    <DesktopReader articles={articles} />

    {/* 모바일 — 카드 스트림 (<1024px) */}
    <main className="mobile-feed">
      <div className="stream">
        {articles.map((a, i) => (
          <div className="story" key={a.id}>
            <a className="card" href={`/article/${a.id}`}>
              <div className="kicker">{feedTime(a.published_at)}</div>
              <div className="card-title">{a.ai_headline || a.title}</div>
              {a.summary_short && <p className="summary">{a.summary_short}</p>}
              {a.thumbnail_url && <img className="thumb" src={a.thumbnail_url} alt="" loading="lazy" />}
              <div className="card-actions">
                <LikeButton id={a.id} showLabel />
              </div>
            </a>

            {/* 5번째 카드마다 구독 CTA 삽입 */}
            {i === 4 && (
              <div className="sub-cta">
                <h3>더 깊이 있는 뉴스를 매일</h3>
                <p>구독하면 맞춤 브리핑과 원문 전문을 받아볼 수 있어요</p>
                <button className="subscribe-pill">구독하기</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
    </>
  );
}
