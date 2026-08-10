"use client";
import { useState } from "react";
import type { Article } from "@shared/types";

// 상태 배지 라벨
const STATUS_LABEL: Record<Article["status"], string> = {
  published: "게시됨",
  hidden: "숨김",
  draft: "초안",
  scheduled: "예약",
};

function fmtDate(iso: string): string {
  // 서버/클라이언트 동일 출력(YYYY-MM-DD HH:mm) — 로케일 차이로 인한 hydration 불일치 방지.
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function AdminCard({
  article,
  onRemoved,
}: {
  article: Article;
  onRemoved: (id: number) => void;
}) {
  const [headline, setHeadline] = useState(article.ai_headline ?? "");
  const [short, setShort] = useState(article.summary_short ?? "");
  const [bullets, setBullets] = useState((article.summary_bullets ?? []).join("\n"));
  const [featured, setFeatured] = useState(article.is_featured);
  const [status, setStatus] = useState<Article["status"]>(article.status);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function patch(payload: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `저장 실패 (${res.status})`);
      }
      return true;
    } catch (e) {
      setMsg((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveSummary() {
    const ok = await patch({
      ai_headline: headline,
      summary_short: short,
      summary_bullets: bullets.split("\n"),
    });
    if (ok) setMsg("저장됨 ✓");
  }

  async function toggleFeatured() {
    const next = !featured;
    const ok = await patch({ is_featured: next });
    if (ok) {
      setFeatured(next);
      setMsg(next ? "Pick 지정됨 ✓" : "Pick 해제됨 ✓");
    }
  }

  async function toggleHidden() {
    const next: Article["status"] = status === "hidden" ? "published" : "hidden";
    const ok = await patch({ status: next });
    if (ok) {
      setStatus(next);
      setMsg(next === "hidden" ? "숨김 처리됨 ✓" : "다시 게시됨 ✓");
    }
  }

  async function remove() {
    if (!confirm(`"${article.title}"\n\n이 기사를 완전히 삭제할까요? (되돌릴 수 없음)`)) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/articles/${article.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `삭제 실패 (${res.status})`);
      }
      onRemoved(article.id);
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <article className="adm-card">
      <div className="adm-head">
        {article.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="adm-thumb" src={article.thumbnail_url} alt="" />
        ) : (
          <div className="adm-thumb adm-thumb--empty" aria-hidden />
        )}
        <div className="adm-meta">
          <div className="adm-title">{article.title}</div>
          <div className="adm-sub">
            <span className={`adm-badge adm-badge--${status}`}>{STATUS_LABEL[status]}</span>
            {featured && <span className="adm-badge adm-badge--top">Pick</span>}
            <span className="adm-date">{fmtDate(article.published_at)}</span>
            <a className="adm-ext" href={article.original_url} target="_blank" rel="noreferrer">
              원문 ↗
            </a>
          </div>
        </div>
      </div>

      <label className="adm-field">
        <span>AI 헤드라인</span>
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} disabled={busy} />
      </label>

      <label className="adm-field">
        <span>요약 본문 (summary_short)</span>
        <textarea rows={5} value={short} onChange={(e) => setShort(e.target.value)} disabled={busy} />
      </label>

      <label className="adm-field">
        <span>핵심 불릿 (한 줄에 하나)</span>
        <textarea rows={4} value={bullets} onChange={(e) => setBullets(e.target.value)} disabled={busy} />
      </label>

      <div className="adm-actions">
        <button className="adm-btn adm-btn--primary" onClick={saveSummary} disabled={busy}>
          저장
        </button>
        <button className="adm-btn" onClick={toggleFeatured} disabled={busy}>
          {featured ? "Pick 해제" : "Pick 지정"}
        </button>
        <button className="adm-btn" onClick={toggleHidden} disabled={busy}>
          {status === "hidden" ? "다시 게시" : "숨김"}
        </button>
        <button className="adm-btn adm-btn--danger" onClick={remove} disabled={busy}>
          삭제
        </button>
        {msg && <span className="adm-msg">{msg}</span>}
      </div>
    </article>
  );
}

export default function AdminList({
  articles,
  adminEmail,
}: {
  articles: Article[];
  adminEmail: string;
}) {
  const [items, setItems] = useState(articles);
  const removeItem = (id: number) => setItems((prev) => prev.filter((a) => a.id !== id));

  return (
    <main className="admin">
      <AdminStyles />
      <div className="adm-topbar">
        <div>
          <div className="kicker">관리자</div>
          <h1 className="adm-h1">Short 요약 관리</h1>
        </div>
        <div className="adm-who">{adminEmail}</div>
      </div>
      <p className="adm-count">총 {items.length}건 (최신 100건)</p>

      <div className="adm-list">
        {items.map((a) => (
          <AdminCard key={a.id} article={a} onRemoved={removeItem} />
        ))}
      </div>
    </main>
  );
}

// 관리자 전용 스타일 — globals.css 를 건드리지 않도록 컴포넌트에 동봉(CSS 변수 재사용).
// CSS 안의 `>` 선택자가 JSX 텍스트로 들어가면 서버/클라이언트 이스케이프가 달라 hydration 불일치가 난다.
// → layout.tsx 의 테마 스크립트처럼 dangerouslySetInnerHTML 로 주입해 React 의 텍스트 재조정을 우회한다.
const ADMIN_CSS = `
      .admin { padding: 16px 14px 64px; max-width: var(--container-max); margin: 0 auto; }
      .adm-error { color: #d33; padding: 24px 0; }
      .adm-topbar { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; margin-bottom:4px; }
      .adm-h1 { font-size: 22px; font-weight: 800; color: var(--text-primary); }
      .adm-who { font-size: 12px; color: var(--text-secondary); font-family: var(--font-mono); }
      .adm-count { font-size: 12px; color: var(--text-secondary); margin: 8px 0 16px; }
      .adm-list { display:flex; flex-direction:column; gap:16px; }
      .adm-card { border:1px solid var(--image-frame); border-radius: var(--r-card); padding:14px; background:var(--canvas); }
      .adm-head { display:flex; gap:12px; margin-bottom:12px; }
      .adm-thumb { width:72px; height:72px; object-fit:cover; border-radius:12px; flex:0 0 auto; background:var(--surface-slate); }
      .adm-thumb--empty { display:block; }
      .adm-meta { min-width:0; }
      .adm-title { font-size:15px; font-weight:700; color:var(--text-primary); line-height:1.3; }
      .adm-sub { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:6px; font-size:11px; color:var(--text-secondary); }
      .adm-badge { padding:2px 7px; border-radius:999px; font-weight:700; font-size:10px; background:var(--surface-slate); color:var(--text-muted); }
      .adm-badge--hidden { background:#fde2e2; color:#a11; }
      .adm-badge--top { background:var(--accent-fill); color:#fff; }
      .adm-date { font-family:var(--font-mono); }
      .adm-ext { color:var(--accent-primary); text-decoration:none; }
      .adm-field { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; }
      .adm-field > span { font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:.02em; }
      .adm-field input, .adm-field textarea {
        width:100%; padding:8px 10px; border:1px solid var(--image-frame); border-radius:10px;
        background:var(--surface-slate); color:var(--text-primary); font:inherit; font-size:14px; resize:vertical;
      }
      .adm-field input:focus, .adm-field textarea:focus { outline:2px solid var(--focus-ring); outline-offset:1px; }
      .adm-actions { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:4px; }
      .adm-btn { padding:8px 14px; border-radius:999px; border:1px solid var(--image-frame); background:var(--canvas);
        color:var(--text-primary); font-weight:700; font-size:13px; cursor:pointer; }
      .adm-btn:disabled { opacity:.5; cursor:default; }
      .adm-btn--primary { background:var(--accent-fill); color:#fff; border-color:transparent; }
      .adm-btn--danger { color:#c22; border-color:#e6b3b3; }
      .adm-msg { font-size:12px; color:var(--text-secondary); }
    `;

function AdminStyles() {
  return <style dangerouslySetInnerHTML={{ __html: ADMIN_CSS }} />;
}
