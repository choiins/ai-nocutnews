import ShortsFeed from "@/components/ShortsFeed";
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

  // 타입 구분 없이 업로드 최신순 그대로 노출 — 쇼츠·가로가 자연스럽게 교차.
  // (RSS 피드가 이미 최신순으로 내려온다.)
  return <ShortsFeed videos={videos} />;
}
