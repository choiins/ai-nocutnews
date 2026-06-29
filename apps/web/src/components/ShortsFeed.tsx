"use client";
import { useEffect, useRef, useState } from "react";

// 세로 스크롤-스냅 Shorts 피드. 화면에 온 영상만 자동재생(음소거), 나머지는 일시정지.
// 소리 제어는 YouTube 기본 컨트롤(controls=1)에 맡긴다.
export default function ShortsFeed({ ids }: { ids: string[] }) {
  const [active, setActive] = useState(0);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const frameRefs = useRef<(HTMLIFrameElement | null)[]>([]);

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
  }, [ids.length]);

  // active 변경 시 재생/정지
  useEffect(() => {
    frameRefs.current.forEach((f, i) => {
      if (!f) return;
      if (i === active) {
        cmd(f, "playVideo");
      } else {
        cmd(f, "pauseVideo");
      }
    });
  }, [active]);

  return (
    <>
      <a href="/" className="shorts-home" aria-label="홈으로">
        노컷<span className="dot">.</span>
      </a>
      <div className="shorts-feed">
        {ids.map((id, i) => {
        const near = Math.abs(i - active) <= 1; // 활성±1만 iframe 마운트
        return (
          <div
            key={id}
            className="short-slide"
            data-idx={i}
            ref={(el) => { slideRefs.current[i] = el; }}
          >
            <div className="short-frame">
              {near ? (
                <iframe
                  ref={(el) => { frameRefs.current[i] = el; }}
                  src={`https://www.youtube.com/embed/${id}?enablejsapi=1&mute=1&playsinline=1&loop=1&playlist=${id}&controls=1&rel=0&modestbranding=1`}
                  title="노컷뉴스 Shorts"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  onLoad={() => { if (i === active) cmd(frameRefs.current[i], "playVideo"); }}
                />
              ) : (
                <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
              )}
            </div>
          </div>
          );
        })}
      </div>
    </>
  );
}
