import WatchList from "@/components/WatchList";
import EmptyState from "@/components/EmptyState";
import { getChannelVideos } from "@/lib/youtube";

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
  return (
    <main>
      <WatchList videos={videos} />
    </main>
  );
}
