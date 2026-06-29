// 노컷뉴스(@cbs_nocut) 채널의 최신 영상을 API 키 없이 수집한다.
// 채널 RSS 피드를 파싱 — 쇼츠+가로영상이 최신순으로 섞여 내려오고,
// <link href>가 /shorts/ 인지로 타입을 구분한다. 실패 시 시드 목록으로 폴백.
const CHANNEL_ID = "UCa97kDUvLn9OSn9xTX0uM_g";

// 폴백 시드 — 빌드 시점에 채널에서 추출한 실제 Shorts ID
const SEED = [
  "MSY7VKr4Bp0", "6V422Hy4eao", "w4hgOKo3Omk", "lI_oXYOpRkM", "6ASvMsOopRk",
  "Wo3qAn4KVV8", "XCxkUnhKd1c", "TSlXVvAIcmo", "A9m0TF_NXdk", "pObhnTilG3c",
];

export type VideoItem = {
  id: string;
  title: string;
  publishedAt: string; // ISO8601, 폴백 시 빈 문자열
  thumbnail: string;
  isShort: boolean;
};

function seedFallback(limit: number): VideoItem[] {
  return SEED.slice(0, limit).map((id) => ({
    id,
    title: "",
    publishedAt: "",
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    isShort: true,
  }));
}

export async function getChannelVideos(limit = 20): Promise<VideoItem[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      {
        headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "ko" },
        next: { revalidate: 1800 }, // 30분 ISR 캐시
      },
    );
    if (!res.ok) throw new Error(`rss feed ${res.status}`);
    const xml = await res.text();

    const items: VideoItem[] = [];
    // <entry> 블록 단위로 순회 (피드는 이미 최신순)
    const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
    let e: RegExpExecArray | null;
    while ((e = entryRe.exec(xml)) !== null && items.length < limit) {
      const block = e[1];
      const id = block.match(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/)?.[1];
      if (!id) continue;
      const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? "";
      const publishedAt = block.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
      const href = block.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? "";
      const thumbnail =
        block.match(/<media:thumbnail[^>]*url="([^"]+)"/)?.[1] ??
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      items.push({
        id,
        title: decodeXml(title),
        publishedAt,
        thumbnail,
        isShort: href.includes("/shorts/"),
      });
    }
    return items.length ? items : seedFallback(limit);
  } catch (err) {
    console.error("RSS 수집 실패, 시드 사용:", (err as Error).message);
    return seedFallback(limit);
  }
}

// XML 엔티티 최소 디코드 (제목에 &amp; &lt; 등)
function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
