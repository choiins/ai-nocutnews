import ShortsFeed from "@/components/ShortsFeed";
import EmptyState from "@/components/EmptyState";
import { getChannelVideos, type VideoItem } from "@/lib/youtube";

export const revalidate = 1800; // 30분마다 채널 영상 재수집

// KST(Asia/Seoul) 기준 날짜 문자열(YYYY-MM-DD)
function kstDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export default async function WatchFeed() {
  const videos = await getChannelVideos(20);
  if (videos.length === 0) {
    return (
      <main>
        <EmptyState message="아직 영상이 없습니다. 노컷뉴스 채널 영상을 불러오지 못했습니다." />
      </main>
    );
  }

  // 재생 순서: 오늘 쇼츠(최신) → 최신 가로 풀영상 → 그 외(지난) 쇼츠(최신)
  // (RSS가 이미 최신순이라 각 묶음은 최신순을 유지한다.)
  const today = kstDate(new Date().toISOString());
  const isToday = (v: VideoItem) => v.publishedAt !== "" && kstDate(v.publishedAt) === today;
  const ordered: VideoItem[] = [
    ...videos.filter((v) => v.isShort && isToday(v)),
    ...videos.filter((v) => !v.isShort),
    ...videos.filter((v) => v.isShort && !isToday(v)),
  ];

  return <ShortsFeed videos={ordered} />;
}
