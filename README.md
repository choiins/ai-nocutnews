# AI 노컷뉴스 (nocut.news)

CBS 노컷뉴스의 AI 기반 뉴스 플랫폼. 노컷뉴스 RSS 톱뉴스를 수집해 AI가 요약하고,
모바일 최적화된 피드로 제공한다. The Verge / WSJ 디자인을 참고했다.

## 메뉴 구성
하단/상단 탭에 노출되는 메뉴는 **Short · Watch · Like** 셋이다.

- **Short** (`/`) — AI 요약('숏컷') 카드 피드. `is_featured` 기사엔 `Pick` 배지
- **Watch** (`/watch`) — 노컷뉴스 유튜브 채널 영상 (쇼츠+가로영상 스크롤-스냅 피드)
- **Like** (`/like`) — 관심사 칩 + 맞춤 피드. 좋아요한 기사는 `/like/saved`
- **Me** (`/me`) — 로그인(Google) · 설정 · 구독(플레이스홀더). 탭이 아니라 헤더의 '구독' 버튼과
  모바일 드로어에서 진입한다
- **`/admin`** — 관리자 전용. 요약 수정 · Pick 배치 · 삭제. 메뉴에는 노출되지 않는다
- **`/original`** — RSS 원문 + 노컷 원문 링크. **페이지는 살아 있으나 앱 안에서 연결되는 링크가
  없어 URL 직접 입력으로만 들어갈 수 있다.** 메뉴에 넣을지 접을지는 미결

## 아키텍처
```
Cloudflare DNS (nocut.news)
  └── Next.js (Vercel)               프론트엔드 (App Router, SSR/ISR)
  └── Supabase (Postgres+Auth)       article DB · 관심사 · 좋아요 · 구독
  └── scripts/ingest.mjs             RSS 폴링 → AI 요약 → 적재
        (GitHub Actions, KST 06~24시 1시간 간격)
        ├── 노컷 RSS top.xml
        └── OpenRouter (요약)
```
- **ISR**: Short / Original / 기사 상세 300초, Watch 1800초
- **Watch는 파이프라인 밖에 있다.** 웹앱이 요청 시점에 유튜브 **채널 RSS**
  (`youtube.com/feeds/videos.xml`)를 직접 파싱한다 — [YouTube Data API도 API 키도 쓰지 않는다](apps/web/src/lib/youtube.ts).
  피드 호출이 실패하면 코드에 박아둔 시드 영상 목록으로 폴백한다.
- DB/Auth는 Supabase RLS로 **공개 read만** 열려 있다(`status='published'` 기사).

## 구조
```
apps/web/                 Next.js 프론트엔드 (공용 타입은 src/shared/)
infra/supabase/migrations DB 스키마 마이그레이션 (0001~0004)
scripts/                  독립 적재 파이프라인 (RSS→요약→Supabase) · 마이그레이션 러너
.github/workflows/        ingest 스케줄 워크플로
```

## 로컬 셋업 (VS Code + Claude Code)
```bash
# 1. 의존성 설치
cd apps/web && npm install

# 2. 환경변수
cp apps/web/.env.example apps/web/.env.local   # Supabase / OpenRouter 키 입력

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

요약 모델은 `OPENROUTER_MODEL`로 바꾼다(기본 `google/gemini-2.5-flash`). **비추론 모델을 쓸 것** —
추론 모델은 토큰을 추론에 소모해 JSON이 잘리고 요약이 통째로 실패한다.

`SUPABASE_DB_URL`은 마이그레이션에만 쓰인다(앱과 ingest는 API 키로 접속하므로, DB 비밀번호를
바꿔도 서비스는 영향받지 않는다). **비밀번호는 영문+숫자로만** 두는 편이 안전하다 — `@ # !` 등이
섞이면 URL 파서를 쓰는 도구에서 깨진다. 마이그레이션은 멱등이라 반복 실행해도 안전하다
(정책은 `drop policy if exists` → `create policy` 순서로 재생성된다).

**보존 정책:** ingest 실행 시 `RETENTION_DAYS`(기본 30)일 지난 RSS 기사를 자동 정리해 Supabase
무료 티어(DB 500MB)를 유지한다(`--no-prune`로 비활성). 수기 기사(`source_type='manual'`)는
정리 대상에서 제외된다. 무료 프로젝트는 7일 무활동 시 일시정지되므로 정기 cron ingest가 이를
함께 방지한다.

**자동 실행:** `.github/workflows/ingest.yml`이 `cron: '17 0-14,21-23 * * *'`로 돈다 —
**KST 06:00~24:00 사이 1시간 간격(하루 18회), KST 00~05시는 휴식.** 맥 전원과 무관하고 무료다.
키는 GitHub Actions Secrets로 주입한다.
GitHub는 저장소에 60일간 커밋이 없으면 예약 워크플로를 끈다(2026-10에 실제로 7일 중단됨) —
그래서 워크플로 마지막 `Keepalive` 단계가 매 실행마다 enable API를 호출해 스스로 켜진 상태를 유지한다.
그래도 꺼져 있으면 `gh workflow enable ingest.yml`. 로컬에서 직접 돌릴 땐:
```bash
node --env-file=apps/web/.env.local scripts/ingest.mjs
```
cron이 `0`분이 아니라 `17`분인 이유: GitHub 문서상 예약 실행은 고부하 시 지연되고
"some queued jobs may be dropped" — 매시 정각이 가장 혼잡하다. 실측으로도 정시 대비 5~50분씩
밀린다. **예약 실행에 정시성을 기대하면 안 된다.** 밀린 분을 즉시 채우려면 수동 실행:
```bash
gh workflow run ingest.yml
```

## 배포
Vercel 프로젝트(`cbsnewslab/ai-nocutnews`)에 **Git 연동이 걸려 있지 않다.** `git push`만으로는
라이브에 반영되지 않으니, 배포는 반드시 CLI로 한다:
```bash
cd apps/web && vercel --prod
```
환경변수는 저장소가 아니라 Vercel 프로젝트 설정에 있다(프로덕션: Supabase URL/anon 키,
`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`). 새 env를 추가했다면 Vercel 쪽에도 넣어야 한다.

## 관리자 페이지 (`/admin`)
`ADMIN_EMAILS`(콤마 구분)에 든 로그인 이메일만 접근한다. 그 외에는 `/me`로 리다이렉트.
페이지와 API 양쪽에서 `requireAdmin()`으로 재검증하며, 쓰기는 service_role 클라이언트로
RLS를 우회한다(`articles`에 쓰기 정책이 없어 anon 키로는 수정 불가).

- **저장** — `ai_headline` / `summary_short` / `summary_bullets` 수정
- **Pick 지정/해제** — `is_featured` 토글. 지정하면 Short 피드와 데스크톱 리더에 `Pick` 배지가 붙는다
- **삭제** — 되돌릴 수 없음(확인 대화 후 실행)

`SUPABASE_SERVICE_ROLE_KEY`와 `ADMIN_EMAILS`는 로컬 `.env.local`과 Vercel 프로덕션 양쪽에
모두 있어야 한다.

## 게시 정책 (1단계)
**자동 게시 MVP** — ingest가 RSS 수집 → AI 요약 → `status='published'`로 즉시 적재.
(추후 편집자 검수 흐름은 `status='draft'` 토글로 전환 가능. 관리자 페이지에서 승인.)

## 확장 대비 (아직 미구현, 구조만 열어둠)
기사 작성 툴·에디터를 추후 "데이터 마이그레이션 없이" 붙일 수 있게 스키마에 자리를 만들어 뒀다:

- `articles.source_type` — `'rss'` 기본, 추후 `'manual'` 수기 기사 공존 (0002)
- `articles.status` 제약에 `draft`/`scheduled` 미리 허용 — 추후 검수·예약발행 (0002).
  `scheduled` 기사는 미래 `published_at`이 발행 예정시각 역할을 하고, 부분 인덱스도 만들어 뒀다
- `profiles` / `article_revisions` 테이블과 역할 RLS는 0002에 **주석으로 자리만** 예약

관리자 라우트(`/admin`)는 예약해둔 대로 구현 완료. 역할 테이블 대신 `ADMIN_EMAILS` 환경변수
화이트리스트로 게이팅한다. 편집자가 늘어 DB 기반 역할 관리가 필요해지면 0002에 예약된
`profiles` 테이블로 옮긴다.

## 디자인
The Verge 시스템 + CBS 액센트. **기본 테마는 라이트**이고 다크는 헤더 토글
(`LIGHT / DARK / AUTO`)로 `[data-theme="dark"]`를 씌운다.

- 액센트: CBS 블루 `#0067b1` (다크 `#0072ce`), 보조 민트 `#3cffd0` · 바이올렛 `#5200ff`
- 폰트: Pretendard + IBM Plex Mono (모노 대문자 라벨)
- 레이아웃: 모바일 폭 480px 고정(`--container-max`), 데스크톱은 가운데 정렬 + 우측 기사 인덱스
- 피드: 색블록 타일 카드 + StoryStream 타임라인(`.stream` / `.story`)

## 개발 순서 (MVP)
1. ✅ 폴더구조 셋업
2. ✅ Supabase 스키마 적용(0001~0004) → ingest 파이프라인 가동 (GitHub Actions)
3. ✅ Short / Watch 읽기 전용 피드 (Original은 링크 미연결 — 위 '메뉴 구성' 참고)
4. ✅ Auth(Google) + Like + Me — 구독 결제는 미착수(플레이스홀더)
5. ✅ 관리자 페이지 (`/admin`) — 기사 작성 에디터는 미착수
6. ⬜ 토스인앱 / 앱 패키징
