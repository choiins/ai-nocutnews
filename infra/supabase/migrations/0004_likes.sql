-- ============================================================
-- 0004 — 좋아요(Like) 기사 저장
-- 목적: Short 피드에서 누른 좋아요를 사용자별로 저장하고,
--       Like 페이지에서 (1) 좋아요한 기사 (2) 그 기사들의 토픽을 공유한
--       관련 기사를 함께 보여주기 위한 1급 테이블.
-- 0003의 user_topics(관심사 구독)는 그대로 유지한다.
-- ============================================================

create table if not exists article_likes (
  user_id    uuid   not null,                    -- auth.users
  article_id bigint not null references articles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, article_id)
);
create index if not exists idx_article_likes_user on article_likes (user_id, created_at desc);

-- ============================================================
-- RLS — 본인 것만 read/write
-- ============================================================
alter table article_likes enable row level security;

create policy "own likes select" on article_likes
  for select using (auth.uid() = user_id);
create policy "own likes insert" on article_likes
  for insert with check (auth.uid() = user_id);
create policy "own likes delete" on article_likes
  for delete using (auth.uid() = user_id);
