"use client";
import { useEffect, useRef, useState } from "react";
import type { VideoItem } from "@/lib/youtube";

// 세로 스크롤-스냅 몰입 피드. 쇼츠는 화면을 꽉 채우고(9:16), 가로영상은 16:9 레터박스로
// 가운데 재생한다. 화면에 온 영상만 자동재생(음소거), 나머지는 일시정지.
// 소리 제어는 YouTube 기본 컨트롤(controls=1)에 맡긴다.
// 재생 중에는 헤더(.media-playing)를 숨기고, 일시정지하면 다시 보여준다.
// onClose가 주어지면 닫기(✕) 오버레이로, 없으면 홈 링크를 띄운다(워치 단독 페이지).
export default function ShortsFeed({
  videos,
  startIndex = 0,
  onClose,
}: {
  videos: VideoItem[];
  startIndex?: number;
  onClose?: () => void;
}) {
  const [active, setActive] = useState(startIndex);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const frameRefs = useRef<(HTMLIFrameElement | null)[]>([]);
  const playingSrc = useRef<Set<MessageEventSource>>(new Set()); // 재생 중인 iframe window 집합

  // 마운트 시 시작 영상으로 즉시 스크롤(스냅)
  useEffect(() => {
    slideRefs.current[startIndex]?.scrollIntoView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cmd = (frame: HTMLIFrameElement | null, func: string) =>
    frame?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      "*",
    );

  // 가장 많이 보이는 슬라이드를 active로
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            setActive(Number((e.target as HTMLElement).dataset.idx));
          }
        });
      },
      { threshold: [0.6] },
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [videos.length]);

  // active 변경 시 재생/정지
  useEffect(() => {
    frameRefs.current.forEach((f, i) => {
      if (!f) return;
      if (i === active) cmd(f, "playVideo");
      else cmd(f, "pauseVideo");
    });
  }, [active]);

  // YouTube 플레이어 상태 이벤트 수신 → 하나라도 재생 중이면 헤더 숨김
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!String(e.origin).includes("youtube.com") || !e.source) return;
      let d: { event?: string; info?: number | { playerState?: number } };
      try {
        d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      let state: number | undefined;
      if (d?.event === "onStateChange") state = d.info as number;
      else if (d?.event === "infoDelivery") state = (d.info as { playerState?: number })?.playerState;
      else return;
      if (state === undefined) return;
      // 1 재생 · 3 버퍼링 → 활성 / 그 외(0 종료·2 정지·5 대기·-1 미시작) → 비활성
      if (state === 1 || state === 3) playingSrc.current.add(e.source);
      else playingSrc.current.delete(e.source);
      document.documentElement.classList.toggle("media-playing", playingSrc.current.size > 0);
    };
    window.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("message", onMsg);
      document.documentElement.classList.remove("media-playing", "chrome-show");
    };
  }, []);

  // 영상 타입별 임베드 URL — 쇼츠는 반복재생, 가로는 1회 재생
  const embedSrc = (v: VideoItem) => {
    const base = `https://www.youtube.com/embed/${v.id}?enablejsapi=1&mute=1&playsinline=1&controls=1&rel=0&modestbranding=1`;
    return v.isShort ? `${base}&loop=1&playlist=${v.id}` : base;
  };

  return (
    <>
      {onClose ? (
        <button className="shorts-close" onClick={onClose} aria-label="닫기">
          ✕
        </button>
      ) : (
        <a href="/" className="shorts-home" aria-label="홈으로">
          노컷<span className="dot">.</span>
        </a>
      )}
      <div className="shorts-feed">
        {videos.map((v, i) => {
          const near = Math.abs(i - active) <= 1; // 활성±1만 iframe 마운트
          return (
            <div
              key={v.id}
              className="short-slide"
              data-idx={i}
              ref={(el) => { slideRefs.current[i] = el; }}
            >
              <div className={`short-frame${v.isShort ? "" : " wide"}`}>
                {near ? (
                  <iframe
                    ref={(el) => { frameRefs.current[i] = el; }}
                    src={embedSrc(v)}
                    title={v.title || "노컷뉴스 영상"}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    onLoad={() => {
                      // 재생 상태 이벤트 수신 시작 + 활성 슬라이드면 즉시 재생
                      frameRefs.current[i]?.contentWindow?.postMessage('{"event":"listening"}', "*");
                      if (i === active) cmd(frameRefs.current[i], "playVideo");
                    }}
                  />
                ) : (
                  <img src={v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt="" loading="lazy" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
