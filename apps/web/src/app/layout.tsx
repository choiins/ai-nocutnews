import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "AI 노컷뉴스",
  description: "노컷뉴스 톱뉴스를 AI가 요약해 모바일에 최적화한 뉴스 플랫폼",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// 페인트 전에 테마를 적용해 깜빡임(FOUC) 방지. 기본값은 라이트.
const themeInit = `(function(){try{var p=localStorage.getItem('theme')||'light';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <div className="shell">
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
