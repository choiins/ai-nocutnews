import ShortsFeed from "@/components/ShortsFeed";
import EmptyState from "@/components/EmptyState";
import { getChannelShorts } from "@/lib/youtube";

export const revalidate = 1800; // 30분마다 채널 Shorts 재수집

export default async function WatchFeed() {
  const ids = await getChannelShorts(15);
  if (ids.length === 0) {
    return (
      <main>
        <EmptyState message="아직 영상이 없습니다. 노컷뉴스 채널 Shorts를 불러오지 못했습니다." />
      </main>
    );
  }
  return (
    <main>
      <ShortsFeed ids={ids} />
    </main>
  );
}
