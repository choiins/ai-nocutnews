"use client";

// 가로영상 전체화면 몰입 플레이어. 검은 배경 가운데 16:9 레터박스로 재생한다.
// 재생/정지 상태는 ShortsFeed와 동일하게 YouTube iframe 이벤트로 WatchList가 받아
// 헤더(.media-playing)를 토글한다. 닫기·홈은 헤더와 무관하게 항상 떠 있어 갇힘을 막는다.
// 레터박스(영상 바깥 검은 여백)를 탭하면 재생 중에도 헤더를 잠깐 노출한다.
export default function VideoOverlay({
  id,
  title,
  onClose,
}: {
  id: string;
  title?: string;
  onClose: () => void;
}) {
  // 영상 바깥 검은 여백 탭 → 재생 중 헤더 일시 노출(.chrome-show) 토글
  const toggleChrome = () =>
    document.documentElement.classList.toggle("chrome-show");

  return (
    <div className="video-overlay" onClick={toggleChrome}>
      <button className="shorts-close" onClick={onClose} aria-label="닫기">
        ✕
      </button>
      <a href="/" className="shorts-home" aria-label="홈으로">
        노컷<span className="dot">.</span>
      </a>
      <iframe
        src={`https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1`}
        title={title || "노컷뉴스 영상"}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        onClick={(e) => e.stopPropagation()}
        onLoad={(e) =>
          e.currentTarget.contentWindow?.postMessage('{"event":"listening"}', "*")
        }
      />
    </div>
  );
}
