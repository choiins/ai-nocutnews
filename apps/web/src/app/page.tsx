import { getArticles } from "@/lib/data";
import DesktopReader from "@/components/DesktopReader";
import LikeButton from "@/components/LikeButton";
import { feedTime } from "@/lib/time";
import { displayTitle } from "@/lib/title";

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
              <div className="kicker kicker-row">
                <span>{feedTime(a.published_at)}</span>
                {a.is_featured && <span className="pick-tag">Pick</span>}
              </div>
              <div className="card-title">{displayTitle(a.ai_headline || a.title)}</div>
              {a.summary_short && <p className="summary">{a.summary_short}</p>}
              {a.thumbnail_url && <img className="thumb" src={a.thumbnail_url} alt="" loading="lazy" />}
              <div className="card-actions">
                <LikeButton id={a.id} showLabel />
              </div>
            </a>

            {/* 5번째 카드마다 구독 CTA + 사이트 안내 삽입 */}
            {i === 4 && (
              <>
                <div className="sub-cta">
                  <h3>더 깊이 있는 뉴스를 매일</h3>
                  <p>구독하면 맞춤 브리핑과 원문 전문을 받아볼 수 있어요</p>
                  <a href="/me" className="subscribe-pill">구독하기</a>
                </div>
                <aside className="site-note">
                  <p>
                    이 사이트는 AI를 활용해 CBS노컷뉴스 기사를 더 편하고 빠르게 읽을 수 있도록 만든 서비스입니다.
                    AI가 원문을 요약·재구성하는 과정에서 표현의 차이나 오류가 있을 수 있으니,
                    정확한 내용은 각 기사의 <b>‘원문 보기’</b>에서 확인해 주세요.
                  </p>
                  <p>
                    편집·구성 방식은 CBS노컷뉴스의 편집 방향과 일치하지 않을 수 있습니다.
                    본 사이트는 개발·테스트 목적의 실험적 서비스이며,
                    문의나 오류 신고는 <a href="mailto:cbsnewslab@gmail.com">cbsnewslab@gmail.com</a>으로 보내주세요.
                  </p>
                </aside>
              </>
            )}
          </div>
        ))}
      </div>
    </main>
    </>
  );
}
