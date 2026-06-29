-- ============================================================
-- 0002 — 확장 대비 (read-only 서비스엔 영향 없음)
-- 목적: 추후 기사 작성·에디터·관리자 페이지를 데이터 마이그레이션 없이
--       끼워 넣을 수 있도록 미리 컬럼/제약/자리를 열어둔다.
-- 지금 동작: RSS 자동 수집은 source_type='rss', status='published' 그대로.
-- ============================================================

-- ---------- 출처 구분 ----------
-- 지금은 RSS만. 나중에 수기 기사가 같은 테이블에 섞여도 무탈하도록 미리 추가.
alter table articles
  add column if not exists source_type text not null default 'rss'
  check (source_type in ('rss','manual'));

-- ---------- 상태 값 여유 ----------
-- 지금은 'published'만 사용. 추후 검수(draft)·예약발행(scheduled)을
-- 붙일 때 제약조건을 다시 건드리지 않도록 미리 허용해 둔다.
alter table articles drop constraint if exists articles_status_check;
alter table articles add constraint articles_status_check
  check (status in ('published','draft','scheduled','hidden'));

-- ---------- 예약 발행 대비 ----------
-- scheduled 기사는 published_at(미래시각)이 곧 발행 예정시각 역할.
-- 추후 n8n이 1분 폴링으로 scheduled → published 전환. 지금은 미사용.
create index if not exists idx_articles_scheduled
  on articles (published_at) where status = 'scheduled';

-- ============================================================
-- [추후 관리자 페이지용 자리 — 지금은 생성하지 않음]
-- 아래는 작성/에디터 단계에서 활성화할 예정. 주석으로만 남겨 설계 의도를 고정.
--
-- create table profiles (
--   id uuid primary key references auth.users(id),
--   display_name text,
--   role text not null default 'reporter'
--        check (role in ('admin','editor','reporter')),
--   created_at timestamptz default now()
-- );
--
-- create table article_revisions (
--   id bigint generated always as identity primary key,
--   article_id bigint references articles(id) on delete cascade,
--   title text, body_full text, summary_short text,
--   edited_by uuid references auth.users(id),
--   created_at timestamptz default now()
-- );
--
-- 추후 RLS (역할 기반 쓰기):
--   editor/admin → articles insert/update/delete
--   reporter     → 본인 editor_id 행만 update (draft 한정)
-- 현재 공개 read 정책(0001)은 그대로 유지. service_role(n8n 적재)은 RLS 우회.
-- ============================================================
