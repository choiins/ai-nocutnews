// 노컷뉴스(@cbs_nocut) 채널의 Shorts 영상 ID를 API 키 없이 수집한다.
// 채널 Shorts 페이지 HTML의 reelWatchEndpoint를 파싱. 실패 시 시드 목록으로 폴백.
const CHANNEL_ID = "UCa97kDUvLn9OSn9xTX0uM_g";

// 폴백 시드 — 빌드 시점에 채널에서 추출한 실제 Shorts ID
const SEED = [
  "MSY7VKr4Bp0", "6V422Hy4eao", "w4hgOKo3Omk", "lI_oXYOpRkM", "6ASvMsOopRk",
  "Wo3qAn4KVV8", "XCxkUnhKd1c", "TSlXVvAIcmo", "A9m0TF_NXdk", "pObhnTilG3c",
];

export async function getChannelShorts(limit = 15): Promise<string[]> {
  try {
    const res = await fetch(`https://www.youtube.com/channel/${CHANNEL_ID}/shorts`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "ko" },
      next: { revalidate: 1800 }, // 30분 ISR 캐시
    });
    if (!res.ok) throw new Error(`shorts page ${res.status}`);
    const html = await res.text();

    const ids: string[] = [];
    const re = /"reelWatchEndpoint":\{"videoId":"([A-Za-z0-9_-]{11})"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null && ids.length < 200) {
      if (!ids.includes(m[1])) ids.push(m[1]);
    }
    return (ids.length ? ids : SEED).slice(0, limit);
  } catch (e) {
    console.error("Shorts 수집 실패, 시드 사용:", (e as Error).message);
    return SEED.slice(0, limit);
  }
}
