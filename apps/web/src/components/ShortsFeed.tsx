"use client";
import { useEffect, useRef, useState } from "react";

// 세로 스크롤-스냅 Shorts 피드. 화면에 온 영상만 자동재생(음소거), 나머지는 일시정지.
// 소리 제어는 YouTube 기본 컨트롤(controls=1)에 맡긴다.
// onClose가 주어지면 전체화면 오버레이로 동작(워치 리스트에서 쇼츠 탭 시),
// 없으면 기존 단독 페이지처럼 홈 링크를 띄운다.
export default function ShortsFeed({
  ids,
  startIndex = 0,
  onClose,
}: {
  ids: string[];
  startIndex?: number;
  onClose?: () => void;
}) {
  const [active, setActive] = useState(startIndex);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const frameRefs = useRef<(HTMLIFrameElement | null)[]>([]);

  // 마운트 시 시작 쇼츠로 즉시 스크롤(스냅)
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
                  onLoad={() => {
                    // 재생 상태 이벤트 수신 시작 (WatchList가 받아 메뉴 토글)
                    frameRefs.current[i]?.contentWindow?.postMessage('{"event":"listening"}', "*");
                    if (i === active) cmd(frameRefs.current[i], "playVideo");
                  }}
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
