// 공용 타입 — apps/web 과 n8n 함수 노드에서 공유

export interface Article {
  id: number;
  source_id: string;
  title: string;
  original_url: string;
  body_full: string | null;
  summary_short: string | null;
  summary_bullets: string[] | null;
  ai_headline: string | null;
  thumbnail_url: string | null;
  category_id: number | null;
  keywords?: string[];   // 자동 추출된 토픽 slug — Like 맞춤 피드 매칭용
  published_at: string;
  status: "published" | "draft" | "scheduled" | "hidden";
  source_type: "rss" | "manual";
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

// 관심사 키워드(개체) — 인물/정당/이슈/스포츠/연예인
export type TopicType = "person" | "party" | "issue" | "sports" | "celebrity";

export interface Topic {
  slug: string;
  name: string;
  type: TopicType;
  mention_count?: number; // 최근 언급 빈도 — 트렌딩 정렬용
}

export interface YoutubeVideo {
  id: number;
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  url: string;
  published_at: string;
}

export interface Category {
  id: number;
  slug: string;
  name_ko: string;
  sort_order: number;
}

// RSS item을 파싱한 원자료 (n8n → DB 적재 전 단계)
export interface RawRssItem {
  source_id: string;     // /news/{id} 에서 추출
  title: string;
  original_url: string;
  body_full: string;     // description 전문
  thumbnail_url: string | null;
  published_at: string;  // ISO
}

// Claude 요약 응답 형태
export interface ShortcutSummary {
  ai_headline: string;
  summary_short: string;
  summary_bullets: string[];
  category_slug: string; // 자동 분류 결과
}
