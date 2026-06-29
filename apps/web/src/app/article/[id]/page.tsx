import { getArticleById } from "@/lib/data";
import { notFound } from "next/navigation";
import { feedTime } from "@/lib/time";

export const revalidate = 300;

export default async function ArticleDetail({ params }: { params: { id: string } }) {
  const a = await getArticleById(params.id);
  if (!a) notFound();

  return (
    <main style={{ marginTop: 8 }}>
      <article className="card" style={{ border: "none", padding: "8px 0" }}>
        <div className="kicker">{feedTime(a.published_at)}</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: "8px 0 4px" }}>
          {a.ai_headline || a.title}
        </h1>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)", marginBottom: 16 }}>
          {new Date(a.published_at).toLocaleString("ko-KR", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Seoul" })}
        </div>

        {a.thumbnail_url && <img className="thumb" src={a.thumbnail_url} alt="" style={{ marginTop: 0 }} />}

        {/* AI 요약 */}
        {a.summary_short && (
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--text-muted)", marginTop: 18 }}>
            {a.summary_short}
          </p>
        )}
        {Array.isArray(a.summary_bullets) && a.summary_bullets.length > 0 && (
          <ul className="bullets" style={{ marginTop: 16 }}>
            {a.summary_bullets.map((b: string, k: number) => <li key={k} style={{ fontSize: 14 }}>{b}</li>)}
          </ul>
        )}

        {/* 원문 */}
        {a.body_full && (
          <details style={{ marginTop: 24, borderTop: "1px solid var(--image-frame)", paddingTop: 16 }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: "var(--accent-secondary)" }}>
              원문 전체 보기
            </summary>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "var(--text-muted)", marginTop: 14, whiteSpace: "pre-wrap" }}>
              {a.body_full}
            </p>
          </details>
        )}

        <a href={a.original_url} target="_blank" rel="noopener noreferrer"
           style={{ display: "inline-block", marginTop: 24, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 1, color: "var(--accent-primary)" }}>
          노컷뉴스에서 보기 ↗
        </a>
      </article>
    </main>
  );
}
