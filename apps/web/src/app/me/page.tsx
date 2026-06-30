"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";
import { getBrowserSupabase } from "@/lib/supabaseClient";

// 구글 "G" 로고
const GoogleG = (
  <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden>
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62Z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
  </svg>
);

// Me — 구글 로그인 · 계정 · 로그아웃.
export default function MePage() {
  const { user, isLoggedIn, ready, signInWithGoogle, signOut } = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const configured = !!getBrowserSupabase();

  // 콜백 실패(?error=auth)로 돌아온 경우 안내
  useEffect(() => {
    if (new URLSearchParams(location.search).get("error") === "auth") {
      setErr("로그인에 실패했어요. 다시 시도해 주세요.");
    }
  }, []);

  const login = async () => {
    setErr("");
    setBusy(true);
    try {
      await signInWithGoogle();
      // 실제 모드: 구글로 리다이렉트되어 이 아래는 실행되지 않음.
      // 목업 모드: 즉시 로그인되므로 busy 해제.
    } catch (e) {
      setErr((e as Error).message || "로그인 중 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return <main />;

  // ---------- 로그인 상태: 계정 화면 ----------
  if (isLoggedIn) {
    return (
      <main>
        <div className="me-account">
          <div className="me-avatar" aria-hidden>
            {(user?.email?.[0] ?? "·").toUpperCase()}
          </div>
          <div className="me-id">
            <div className="kicker">내 계정</div>
            <div className="me-email">{user?.email ?? "게스트"}</div>
          </div>
        </div>

        <section className="like-block">
          <div className="side-head">바로가기</div>
          <div className="me-links">
            <a className="me-link" href="/like">
              <span>좋아요 · 맞춤 피드</span><span aria-hidden>›</span>
            </a>
            <a className="me-link" href="/">
              <span>오늘의 Short</span><span aria-hidden>›</span>
            </a>
          </div>
        </section>

        <section className="like-block">
          <div className="side-head">구독</div>
          <div className="me-sub-card">
            <div>
              <b>무료 플랜</b>
              <p>프리미엄 구독은 곧 제공됩니다.</p>
            </div>
            <button className="subscribe-pill" disabled>곧 출시</button>
          </div>
        </section>

        <button className="me-signout" onClick={() => signOut()}>로그아웃</button>
      </main>
    );
  }

  // ---------- 비로그인: 구글 로그인 ----------
  return (
    <main>
      <div className="auth-card">
        <div className="kicker">로그인</div>
        <h1 className="auth-title">노컷에 오신 걸 환영해요</h1>
        <p className="auth-lead">
          구글 계정으로 로그인하면 좋아요한 기사와 관심사가 기기 간에 저장돼요.
        </p>

        {!configured && (
          <p className="auth-error">
            Supabase 키가 설정되지 않아 목업(게스트) 로그인으로 동작합니다.
          </p>
        )}

        {err && <p className="auth-error">{err}</p>}

        <button className="google-btn" onClick={login} disabled={busy}>
          {GoogleG}
          <span>{busy ? "이동 중…" : configured ? "구글로 로그인" : "게스트로 시작"}</span>
        </button>
      </div>
    </main>
  );
}
