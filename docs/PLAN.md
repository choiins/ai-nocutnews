# AI 노컷뉴스 — 개발 플랜

## 현재 범위 (read-only 서비스)
RSS 톱뉴스 수집 → AI 요약(Short/Original) + 유튜브 영상(Watch). 읽기 전용.
- Short    : AI 요약 카드 피드 (StoryStream 타임라인)
- Original : RSS 원문 + 노컷 원문 링크
- Watch    : 유튜브 채널 영상 그리드
- Like/Me  : 플레이스홀더 (인증/구독 단계에서 구현)

## 확장 대비 (지금은 미구현, 구조만 열어둠)
기사 작성 툴·에디터·관리자 페이지를 추후 "데이터 마이그레이션 없이" 붙일 수 있게:
- articles.source_type ('rss' 기본) — 추후 'manual' 수기 기사 공존
- articles.status 제약에 draft/scheduled 미리 허용 — 추후 검수·예약발행
- profiles / article_revisions 테이블, 역할 RLS는 0002에 주석으로 자리만 예약
- 관리자 라우트(/admin)는 미생성. 같은 Supabase를 service_role로 쓰는 구조 전제.

## 아키텍처
- 프론트: Next.js (App Router) → Vercel, ISR 5분
- DB/Auth: Supabase (Postgres + RLS, 공개 read만 활성)
- 파이프라인: 독립 스크립트(scripts/ingest.mjs) — GitHub Actions 매시간: RSS → OpenRouter 요약 → 적재
- DNS: Cloudflare (nocut.news)

## 디자인
The Verge 시스템 + 노컷 액센트(레드 #ff2d4f / 블루 #1a56ff). 다크 캔버스,
색블록 타일, StoryStream 타임라인, 모노 대문자 라벨. Pretendard + IBM Plex Mono.

## 진행 순서
1. Supabase 생성 → migrate.mjs로 0001~0003 적용
2. ingest 파이프라인 가동: GitHub Actions(.github/workflows/ingest.yml) 매시간 또는 로컬 수동 실행
3. apps/web: npm install → .env.local → npm run dev
4. (추후) 인증 + Like + Me + 구독
5. (추후) 기사 작성 페이지 + 에디터 + 관리자 페이지  ← 0002에서 자리 예약됨
