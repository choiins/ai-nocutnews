import ShortsFeed from "@/components/ShortsFeed";
import EmptyState from "@/components/EmptyState";
import { getChannelVideos, type VideoItem } from "@/lib/youtube";

export const revalidate = 1800; // 30분마다 채널 영상 재수집

export default async function WatchFeed() {
  const videos = await getChannelVideos(20);
  if (videos.length === 0) {
    return (
      <main>
        <EmptyState message="아직 영상이 없습니다. 노컷뉴스 채널 영상을 불러오지 못했습니다." />
      </main>
    );
  }

  // 재생 순서: 가로 풀영상(최신) 먼저 → 쇼츠(최신)를 뒤로.
  // watch는 '영상 시청' 성격이라 진입 즉시 풀영상이 재생되도록 한다.
  // (RSS가 이미 최신순이라 각 묶음은 최신순을 유지한다.)
  const ordered: VideoItem[] = [
    ...videos.filter((v) => !v.isShort),
    ...videos.filter((v) => v.isShort),
  ];

  return <ShortsFeed videos={ordered} />;
}
