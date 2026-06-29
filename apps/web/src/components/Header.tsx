"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

// 플로팅 하단 탭 — short · watch · like 만
const TABS = [
  { href: "/", label: "Short" },
  { href: "/watch", label: "Watch" },
  { href: "/like", label: "Like" },
];

const BellIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);
const MenuIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="4" y1="8" x2="20" y2="8" />
    <line x1="4" y1="16" x2="20" y2="16" />
  </svg>
);
const CloseIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);
const SearchIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// 헤더 탭 아이콘 — Short(로봇) · Watch(재생) · Like(좋아요 손)
const RobotIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="8" width="16" height="11" rx="2.5" />
    <path d="M12 8V5" /><circle cx="12" cy="3.5" r="1.2" />
    <path d="M2 12.5v3" /><path d="M22 12.5v3" />
    <circle cx="9" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
const PlayIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" stroke="none" />
  </svg>
);
const ThumbIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 10v11" />
    <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
  </svg>
);
const TAB_ICONS: Record<string, React.ReactNode> = {
  "/": RobotIcon,
  "/watch": PlayIcon,
  "/like": ThumbIcon,
};

const Wordmark = ({ sm }: { sm?: boolean }) => (
  <span className={`wordmark${sm ? " sm" : ""}`}>
    노컷<span className="dot">.</span>
  </span>
);

export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? path === "/" || path.startsWith("/article") : path.startsWith(href);

  return (
    <>
      {/* ---------- 데스크톱 상단 바 (JoongAng 1min 레이아웃 참고) ---------- */}
      <header className="pc-bar">
        <div className="pc-bar-inner">
          <div className="pc-left">
            <a href="/" aria-label="홈"><Wordmark /></a>
          </div>
          <nav className="pc-nav">
            {TABS.map((t) => (
              <a key={t.href} href={t.href} className={`pc-navtab${isActive(t.href) ? " active" : ""}`}>
                <span className="pc-navtab-ico">{TAB_ICONS[t.href]}</span>
                {t.label}
              </a>
            ))}
          </nav>
          <div className="pc-right">
            <button className="icon-btn" aria-label="검색">{SearchIcon}</button>
            <button className="subscribe-pill">구독</button>
          </div>
        </div>
      </header>

      {/* ---------- 상단 바 ---------- */}
      <header className="mobile-bar">
        <a href="/" aria-label="홈"><Wordmark /></a>
        <div className="mobile-actions">
          <button className="subscribe-pill sm">구독</button>
          <button className="icon-btn" aria-label="알림">{BellIcon}</button>
          <button className="icon-btn" aria-label="설정 메뉴" onClick={() => setOpen(true)}>{MenuIcon}</button>
        </div>
      </header>

      {/* ---------- 플로팅 하단 탭 ---------- */}
      <nav className="mtabs">
        {TABS.map((t) => (
          <a key={t.href} href={t.href} className={`mtab${isActive(t.href) ? " active" : ""}`}>
            {t.label}
          </a>
        ))}
      </nav>

      {/* ---------- 설정 드로어 (테마 · 로그인) ---------- */}
      {open && (
        <div className="drawer-backdrop" onClick={() => setOpen(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <Wordmark sm />
              <button className="icon-btn" aria-label="닫기" onClick={() => setOpen(false)}>{CloseIcon}</button>
            </div>
            <div className="drawer-foot" style={{ marginTop: 0 }}>
              <ThemeToggle />
              <a href="/me" className="signin" onClick={() => setOpen(false)}>SIGN IN</a>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
