# AI 노컷뉴스 (nocut.news)

CBS 노컷뉴스의 AI 기반 뉴스 플랫폼. 노컷뉴스 RSS 톱뉴스를 수집해 AI가 요약하고,
모바일 최적화된 피드로 제공한다. The Verge / WSJ 디자인을 참고했다.

## 메뉴 구성
- **Short** — AI 요약('숏컷') 카드 피드 (StoryStream 타임라인)
- **Original** — RSS 원문 + 노컷 원문 링크
- **Watch** — 유튜브 채널 영상
- **Like** — 관심사 기반 맞춤 피드
- **Me** — 로그인 · 구독 · 설정

## 아키텍처
```
Cloudflare DNS (nocut.news)
  └── Next.js (Vercel)               프론트엔드 (SSR/ISR)
  └── Supabase (Postgres+Auth)       article DB · 구독 · 관심사
  └── scripts/ingest.mjs (GitHub Actions, 매시간)  RSS 폴링 → AI 요약 → 적재
        ├── 노컷 RSS top.xml
        ├── OpenRouter (요약)
        └── YouTube Data API
```

## 구조
```
apps/web/                 Next.js 프론트엔드 (공용 타입은 src/shared/)
infra/supabase/           DB 스키마 마이그레이션
scripts/                  독립 적재 파이프라인 (RSS→요약→Supabase) · 마이그레이션
.github/workflows/        ingest 스케줄 워크플로 (매시간)
docs/                     설계 문서
```

## 로컬 셋업 (VS Code + Claude Code)
```bash
# 1. 의존성 설치
cd apps/web && npm install

# 2. 환경변수
cp apps/web/.env.example apps/web/.env.local   # Supabase / OpenRouter / YouTube 키 입력

# 3. 개발 서버 (키 없이도 목업 데이터로 구동)
cd apps/web && npm run dev    # http://localhost:3000
```

### 실데이터 파이프라인 (n8n 없이 — 독립 스크립트)
RSS → OpenRouter 요약 → Supabase 적재를 로컬/cron에서 바로 돌린다.
```bash
cd scripts && npm install

# 1. 스키마 적용 (SUPABASE_DB_URL 필요)
npm run migrate

# 2. 수집·요약·적재 (Supabase + OpenRouter 키 필요)
npm run ingest -- --limit 10        # 미리보기는 --dry 추가
```
`.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`가 채워지면
프론트가 목업 대신 실DB를 읽는다. cron 등록 시 `node --env-file=apps/web/.env.local scripts/ingest.mjs`.

**보존 정책:** ingest 실행 시 `RETENTION_DAYS`(기본 30)일 지난 RSS 기사를 자동 정리해 Supabase
무료 티어(DB 500MB)를 유지한다(`--no-prune`로 비활성). 무료 프로젝트는 7일 무활동 시 일시정지되므로
정기 cron ingest가 이를 함께 방지한다.

**자동 실행(1시간 주기):** `.github/workflows/ingest.yml`이 매시간 `node ingest.mjs`를 실행한다
(맥 전원과 무관, 무료). 키는 GitHub Actions Secrets로 주입. 로컬에서 직접 돌릴 땐:
```bash
node --env-file=apps/web/.env.local scripts/ingest.mjs
```

## 개발 순서 (MVP)
1. ✅ 폴더구조 셋업
2. ✅ Supabase 스키마 적용 → ingest 파이프라인 가동 (데이터 채우기)
3. Short / Original / Watch 읽기 전용 피드
4. Auth + Like + Me + 구독
5. 기사 작성 · 관리자 페이지
6. 토스인앱 / 앱 패키징

## 1단계 게시 정책
**자동 게시 MVP** — ingest가 RSS 수집 → AI 요약 → `status='published'`로 즉시 적재.
(추후 편집자 검수 흐름은 `status='draft'` 토글로 전환 가능. 관리자 페이지에서 승인.)
