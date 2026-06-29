"use client";
import { useEffect, useRef, useState } from "react";
import type { VideoItem } from "@/lib/youtube";
import ShortsFeed from "@/components/ShortsFeed";

// 최신순 단일 컬럼 리스트. 가로영상은 카드 자리에서 인라인 재생,
// 쇼츠는 쇼츠만 추린 몰입(전체화면 스와이프) 피드로 띄운다.
// 재생 중에는 플로팅 메뉴(.mtabs)를 숨기고, 일시정지하면 다시 보여준다.
export default function WatchList({ videos }: { videos: VideoItem[] }) {
  const [playingId, setPlayingId] = useState<string | null>(null); // 인라인 재생 중인 가로영상
  const [shortsStart, setShortsStart] = useState<number | null>(null); // 몰입 피드 시작 인덱스
  const playingSrc = useRef<Set<MessageEventSource>>(new Set()); // 재생 중인 iframe window 집합

  // 몰입 피드는 쇼츠만 대상. 리스트 순서를 유지한 쇼츠 인덱스 맵.
  const shortIds = videos.filter((v) => v.isShort).map((v) => v.id);

  // YouTube 플레이어 상태 이벤트 수신 → 하나라도 재생 중이면 메뉴 숨김
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
      document.documentElement.classList.remove("media-playing");
    };
  }, []);

  // 재생 상태 초기화 (오버레이 닫기 등 iframe 언마운트 시 이벤트가 안 오므로 수동 정리)
  const resetPlaying = () => {
    playingSrc.current.clear();
    document.documentElement.classList.remove("media-playing");
  };

  // iframe 로드 시 상태 이벤트 수신을 시작시키는 핸드셰이크
  const startListening = (el: HTMLIFrameElement | null) =>
    el?.contentWindow?.postMessage('{"event":"listening"}', "*");

  return (
    <>
      <div className="side-head">Watch · 최신순</div>
      <div className="watch-list">
        {videos.map((v) => {
          if (v.isShort) {
            const shortIdx = shortIds.indexOf(v.id);
            return (
              <button
                key={v.id}
                className="video-card short"
                onClick={() => setShortsStart(shortIdx)}
              >
                <div className="video-frame">
                  <img src={v.thumbnail} alt="" loading="lazy" />
                  <span className="shorts-badge">Shorts</span>
                </div>
                <div className="video-meta">
                  {v.title && <div className="video-title">{v.title}</div>}
                  {v.publishedAt && <time className="video-time">{relativeTime(v.publishedAt)}</time>}
                </div>
              </button>
            );
          }
          // 가로영상
          const playing = playingId === v.id;
          return (
            <div key={v.id} className="video-card">
              <div className="video-frame wide">
                {playing ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${v.id}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1`}
                    title={v.title || "노컷뉴스 영상"}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    onLoad={(e) => startListening(e.currentTarget)}
                  />
                ) : (
                  <button className="video-play" onClick={() => setPlayingId(v.id)} aria-label="재생">
                    <img src={v.thumbnail} alt="" loading="lazy" />
                    <span className="play-icon">▶</span>
                  </button>
                )}
              </div>
              <div className="video-meta">
                {v.title && <div className="video-title">{v.title}</div>}
                {v.publishedAt && <time className="video-time">{relativeTime(v.publishedAt)}</time>}
              </div>
            </div>
          );
        })}
      </div>

      {shortsStart !== null && shortIds.length > 0 && (
        <ShortsFeed
          ids={shortIds}
          startIndex={shortsStart}
          onClose={() => { setShortsStart(null); resetPlaying(); }}
        />
      )}
    </>
  );
}

// "방금 전 / n시간 전 / n일 전" 간이 포맷
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}
