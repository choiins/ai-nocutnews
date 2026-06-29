// 관심사 토픽 조회 + 규칙 기반 v1 맞춤 피드 랭킹.
// 지금은 목업(fixtures) 기반. 추후 Supabase(topics/article_topics) 분기를 동일 시그니처로 교체.
import type { Article, Topic, TopicType } from "@shared/types";
import { MOCK_ARTICLES, MOCK_TOPICS } from "./fixtures";

export interface FeedItem {
  article: Article;
  matched: string[]; // 매칭된 토픽 slug
  score: number;
}

export function getTopics(
  opts: { type?: TopicType; q?: string; trending?: boolean } = {},
): Topic[] {
  let list = MOCK_TOPICS.slice();
  if (opts.q) {
    const q = opts.q.trim().toLowerCase();
    list = list.filter((t) => t.name.toLowerCase().includes(q) || t.slug.includes(q));
  } else if (opts.type) {
    list = list.filter((t) => t.type === opts.type);
  }
  if (opts.trending) list.sort((a, b) => (b.mention_count ?? 0) - (a.mention_count ?? 0));
  return list;
}

// 비로그인 샘플/추천 관심사 — "지금 뜨는" 토픽
export const SAMPLE_SLUGS = [
  "worldcup", "ballot-shortage", "kospi", "spacex", "lee-government",
  "minjoo", "ppp", "newjeans", "han-donghoon", "nvidia", "ai", "kbo",
];

export function getSampleTopics(): Topic[] {
  return getTopicsBySlugs(SAMPLE_SLUGS);
}

export function getTopicsBySlugs(slugs: string[]): Topic[] {
  const order = new Map(slugs.map((s, i) => [s, i]));
  return MOCK_TOPICS
    .filter((t) => order.has(t.slug))
    .sort((a, b) => order.get(a.slug)! - order.get(b.slug)!);
}

export function topicName(slug: string): string {
  return MOCK_TOPICS.find((t) => t.slug === slug)?.name ?? slug;
}

// ---------- 규칙 기반 v1 랭킹 ----------
const W_MATCH = 5; //  매칭 토픽 수 가중
const W_RELEVANCE = 1; // 토픽 인기(빈도) 합 가중
const HALF_LIFE_H = 24; // 최신성 반감기(시간)
const MAX_MENTION = 25; // mention_count 정규화 기준

function topicWeight(slug: string): number {
  const t = MOCK_TOPICS.find((x) => x.slug === slug);
  return (t?.mention_count ?? 0) / MAX_MENTION; // 0~1
}

export function getPersonalizedFeed(slugs: string[], limit = 30): FeedItem[] {
  if (slugs.length === 0) return [];
  const want = new Set(slugs);
  const now = Date.now();
  const items: FeedItem[] = [];

  for (const a of MOCK_ARTICLES) {
    const matched = (a.keywords ?? []).filter((k) => want.has(k));
    if (matched.length === 0) continue;

    const ageH = Math.max(0, (now - new Date(a.published_at).getTime()) / 3_600_000);
    const recency = Math.pow(0.5, ageH / HALF_LIFE_H); // 0~1
    const relevance = matched.reduce((s, k) => s + topicWeight(k), 0);
    const score = recency + W_MATCH * matched.length + W_RELEVANCE * relevance;

    items.push({ article: a, matched, score });
  }

  items.sort((x, y) => y.score - x.score);
  return items.slice(0, limit);
}
