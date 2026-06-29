-- ============================================================
-- AI 노컷뉴스 — 초기 스키마
-- 적용: Supabase SQL Editor 또는 supabase db push
-- ============================================================

-- ---------- 카테고리 ----------
create table if not exists categories (
  id          bigint generated always as identity primary key,
  slug        text unique not null,        -- politics, economy, society, it, sports, entertainment ...
  name_ko     text not null,               -- 정치, 경제 ...
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- ---------- 기사 ----------
create table if not exists articles (
  id              bigint generated always as identity primary key,
  source_id       text unique not null,    -- RSS link의 /news/{id} 숫자 → 중복 적재 방지
  title           text not null,
  original_url    text not null,
  body_full       text,                    -- RSS description 원문 (Original 메뉴)
  summary_short   text,                    -- AI 요약 본문 (Short 메뉴)
  summary_bullets jsonb,                   -- AI 핵심 불릿 ["...", "...", "..."]
  ai_headline     text,                    -- AI 재작성 한 줄 헤드라인 (선택)
  thumbnail_url   text,                    -- media:content url
  category_id     bigint references categories(id) on delete set null,
  published_at    timestamptz not null,    -- RSS pubDate
  status          text not null default 'published'  -- published | draft | hidden
                  check (status in ('published','draft','hidden')),
  is_featured     boolean default false,   -- 톱 배치 (관리자 페이지에서 토글)
  editor_id       uuid,                    -- 수동 작성/수정 시 작성자 (auth.users)
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_articles_published on articles (published_at desc);
create index if not exists idx_articles_status     on articles (status);
create index if not exists idx_articles_category   on articles (category_id);
create index if not exists idx_articles_featured   on articles (is_featured) where is_featured = true;

-- 한글 풀텍스트 검색 (간이: simple config + trigram)
create extension if not exists pg_trgm;
create index if not exists idx_articles_title_trgm on articles using gin (title gin_trgm_ops);

-- ---------- 유튜브 영상 (Watch) ----------
create table if not exists youtube_videos (
  id            bigint generated always as identity primary key,
  video_id      text unique not null,
  title         text not null,
  thumbnail_url text,
  url           text not null,
  published_at  timestamptz not null,
  created_at    timestamptz default now()
);
create index if not exists idx_videos_published on youtube_videos (published_at desc);

-- ---------- 관심사 (Like) ----------
create table if not exists interests (
  user_id     uuid not null,               -- auth.users
  category_id bigint not null references categories(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, category_id)
);

-- ---------- 구독 ----------
create table if not exists subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,                -- auth.users
  plan       text not null default 'free', -- free | premium
  status     text not null default 'active', -- active | canceled | expired
  started_at timestamptz default now(),
  ended_at   timestamptz,
  unique (user_id)
);

-- ---------- updated_at 자동 갱신 ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_articles_updated on articles;
create trigger trg_articles_updated
  before update on articles
  for each row execute function set_updated_at();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
alter table articles       enable row level security;
alter table youtube_videos enable row level security;
alter table categories     enable row level security;
alter table interests      enable row level security;
alter table subscriptions  enable row level security;

-- 공개 읽기: 게시된 기사 / 영상 / 카테고리는 누구나 조회
create policy "public read published articles"
  on articles for select using (status = 'published');

create policy "public read videos"
  on youtube_videos for select using (true);

create policy "public read categories"
  on categories for select using (true);

-- 관심사: 본인 것만 read/write
create policy "own interests select" on interests
  for select using (auth.uid() = user_id);
create policy "own interests insert" on interests
  for insert with check (auth.uid() = user_id);
create policy "own interests delete" on interests
  for delete using (auth.uid() = user_id);

-- 구독: 본인 것만 read
create policy "own subscription select" on subscriptions
  for select using (auth.uid() = user_id);

-- 참고: n8n 적재 / 관리자 작업은 service_role 키 사용 → RLS 우회.
--      프론트(anon 키)는 위 공개 read 정책만 통과.

-- ---------- 시드: 카테고리 ----------
insert into categories (slug, name_ko, sort_order) values
  ('politics',      '정치',   1),
  ('economy',       '경제',   2),
  ('society',       '사회',   3),
  ('it',            'IT·과학', 4),
  ('world',         '국제',   5),
  ('sports',        '스포츠', 6),
  ('entertainment', '연예·문화', 7)
on conflict (slug) do nothing;
