import { getArticles } from "@/lib/data";
import DesktopReader from "@/components/DesktopReader";

export const revalidate = 300; // ISR: 5분마다 재생성

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default async function ShortFeed() {
  const articles = await getArticles();

  if (articles.length === 0) {
    return (
      <main>
        <p style={{ color: "var(--text-secondary)", padding: "40px 0" }}>
          아직 표시할 기사가 없습니다. n8n 수집 파이프라인이 데이터를 채우면 여기에 나타납니다.
        </p>
      </main>
    );
  }

  // 단일 스레드 스트림. 맨 위(톱)만 강조하고 나머지는 동일한 카드로 흘린다.
  // 정렬은 data 레이어가 결정(추후 top_rank→최신순). 여기선 받은 순서를 그대로 그린다.
  return (
    <>
    {/* 데스크톱 — JoongAng 1min 스타일 리더 (≥1024px) */}
    <DesktopReader articles={articles} />

    {/* 모바일 — 기존 타임라인 스트림 (<1024px) */}
    <main className="mobile-feed">
      <div className="side-head">Today · Short</div>
      <div className="stream">
        {articles.map((a, i) => {
          const lead = i === 0;
          return (
            <div className="story" key={a.id}>
              <div className="ts">{timeLabel(a.published_at)}</div>
              <a className={lead ? "card lead" : "card"} href={`/article/${a.id}`}>
                <div className="kicker">{lead ? "TOP · SHORT" : "SHORT"}</div>
                <div className="card-title">{a.ai_headline || a.title}</div>
                {a.summary_short && <p className="summary">{a.summary_short}</p>}
                {/* 불릿은 톱 카드에만 — 나머지는 스캔하기 쉽게 요약 한 줄까지만 */}
                {lead && Array.isArray(a.summary_bullets) && a.summary_bullets.length > 0 && (
                  <ul className="bullets">
                    {a.summary_bullets.slice(0, 3).map((b: string, k: number) => <li key={k}>{b}</li>)}
                  </ul>
                )}
                {a.thumbnail_url && <img className="thumb" src={a.thumbnail_url} alt="" loading="lazy" />}
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
          );
        })}
      </div>
    </main>
    </>
  );
}
