-- ============================================================
-- 0003 — 관심사 토픽(키워드) 기반 맞춤 피드(Like)
-- 목적: 기사에서 자동 추출한 개체(인물/정당/이슈/스포츠/연예인)를 1급 토픽으로
--       모델링하고, 사용자가 토픽을 구독하면 알고리즘 피드를 만든다.
-- 0001의 interests(카테고리 단위)는 그대로 유지하고, 키워드 단위를 신설한다.
-- 프론트 프로토타입은 목업/localStorage로 동작하며, 본 스키마로 무이전 전환 대상.
-- ============================================================

-- ---------- 토픽(개체) ----------
create table if not exists topics (
  id            bigint generated always as identity primary key,
  slug          text unique not null,            -- 'lee-jaemyung', 'minjoo', 'chuga' ...
  name          text not null,                   -- 표시명: 이재명, 더불어민주당, 추경예산
  type          text not null
                check (type in ('person','party','issue','sports','celebrity')),
  aliases       jsonb default '[]'::jsonb,       -- 별칭: ["이재명 대표","이 대표"]
  mention_count int  default 0,                  -- 최근 언급 빈도(트렌딩 정렬)
  created_at    timestamptz default now()
);
create index if not exists idx_topics_type    on topics (type);
create index if not exists idx_topics_mention on topics (mention_count desc);

-- ---------- 기사 ↔ 토픽 ----------
create table if not exists article_topics (
  article_id bigint not null references articles(id) on delete cascade,
  topic_id   bigint not null references topics(id)   on delete cascade,
  relevance  real   default 1.0,                 -- 추출 신뢰도/중요도(랭킹 가중)
  primary key (article_id, topic_id)
);
create index if not exists idx_article_topics_topic on article_topics (topic_id);

-- ---------- 사용자 ↔ 토픽 (관심사 구독) ----------
create table if not exists user_topics (
  user_id    uuid   not null,                    -- auth.users
  topic_id   bigint not null references topics(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, topic_id)
);

-- ============================================================
-- RLS
-- ============================================================
alter table topics         enable row level security;
alter table article_topics enable row level security;
alter table user_topics    enable row level security;

-- 토픽/매핑은 공개 read (피드 노출용). 쓰기는 service_role(n8n 적재)만.
create policy "public read topics"         on topics         for select using (true);
create policy "public read article_topics" on article_topics for select using (true);

-- 관심사는 본인 것만 read/write
create policy "own user_topics select" on user_topics
  for select using (auth.uid() = user_id);
create policy "own user_topics insert" on user_topics
  for insert with check (auth.uid() = user_id);
create policy "own user_topics delete" on user_topics
  for delete using (auth.uid() = user_id);

-- ============================================================
-- 맞춤 피드 랭킹 (규칙 기반 v1) — 참고 쿼리
--   recency(반감기 24h) + 5×매칭수 + Σrelevance
-- ------------------------------------------------------------
-- select a.*,
--        count(*)                                  as match_count,
--        array_agg(t.slug)                         as matched,
--        ( power(0.5, extract(epoch from (now()-a.published_at))/3600/24)
--          + 5*count(*)
--          + sum(at.relevance) )                   as score
--   from articles a
--   join article_topics at on at.article_id = a.id
--   join topics t          on t.id = at.topic_id
--  where a.status='published'
--    and at.topic_id in (select topic_id from user_topics where user_id = auth.uid())
--  group by a.id
--  order by score desc
--  limit 30;
-- ============================================================
