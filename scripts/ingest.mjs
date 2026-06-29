// 노컷뉴스 RSS → OpenRouter(LLM) 요약 → Supabase 적재. n8n 없이 로컬/cron에서 실행하는 독립 파이프라인.
//
// 실행:
//   node --env-file=apps/web/.env.local scripts/ingest.mjs [--limit N] [--dry]
//
// 필요 env:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — service_role로 RLS 우회 적재
//   OPENROUTER_API_KEY                                   — 요약용 (https://openrouter.ai/keys)
//   OPENROUTER_MODEL (선택, 기본 moonshotai/kimi-k2.5)
//     다른 모델: anthropic/claude-opus-4.8 등. 정확한 slug는 https://openrouter.ai/models 확인.
//   RETENTION_DAYS (선택, 기본 30) — 이보다 오래된 RSS 기사는 수집 후 자동 삭제(무료 티어 용량 유지).
//                                    --no-prune 플래그로 끌 수 있음.
//
// 동작: RSS top.xml 파싱 → 기존 source_id는 skip → OpenRouter로 요약(JSON) →
//       articles upsert → entities를 topics/article_topics로 적재.
//       요약 실패 건은 summary_* = null로 적재(Original 메뉴에만 노출).

import { createClient } from "@supabase/supabase-js";

const RSS_URL = "https://rss.nocutnews.co.kr/news/top.xml";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "moonshotai/kimi-k2.5";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const NO_PRUNE = args.includes("--no-prune");
const LIMIT = (() => {
  const i = args.indexOf("--limit");
  return i >= 0 ? parseInt(args[i + 1], 10) : 30;
})();
// 보존 기간(일). 이보다 오래된 RSS 기사는 수집 후 자동 정리해 무료 티어 용량을 유지.
const RETENTION_DAYS = process.env.RETENTION_DAYS !== undefined ? parseInt(process.env.RETENTION_DAYS, 10) : 30;

// ---------- env 검증 ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  OPENROUTER_API_KEY: OPENROUTER_KEY,
})) {
  if (!v) {
    console.error(`✗ 환경변수 누락: ${k} (apps/web/.env.local 확인)`);
    process.exit(1);
  }
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ============================================================
// RSS 파서 — 외부 의존성 없이 직접 구현
// ============================================================
function parseNocutRss(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const link = tag(block, "link");
    if (!link) continue;
    const sourceId = (link.match(/\/news\/(\d+)/) || [])[1] || link;
    items.push({
      source_id: sourceId,
      title: tag(block, "title").trim(),
      original_url: link.trim(),
      body_full: tag(block, "description").trim(),
      thumbnail_url: attr(block, /<media:content\s+url="([^"]+)"/),
      published_at: parsePubDate(tag(block, "pubDate")),
    });
  }
  return items;
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  if (!m) return "";
  const c = m[1].match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return c ? c[1] : m[1];
}
function attr(block, re) {
  const m = block.match(re);
  return m ? m[1] : null;
}
function parsePubDate(s) {
  const m = s.match(/(\d{2})\s+(\d{2})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+([+-]\d{4})/);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const [, dd, mm, yyyy, hh, min, ss, tz] = m;
  const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}${tz.slice(0, 3)}:${tz.slice(3)}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ============================================================
// 요약 — OpenRouter(OpenAI 호환) + SUMMARIZE_PROMPT.md 규칙
// ============================================================
const SYSTEM_PROMPT = `당신은 노컷뉴스의 AI 에디터입니다. 주어진 뉴스 원문을 모바일 독자가
빠르게 파악할 수 있도록 요약합니다. 반드시 아래 규칙을 지키세요.

- 사실만 전달하고 의견·추측을 덧붙이지 않습니다.
- 원문에 없는 정보를 만들어내지 않습니다(환각 금지).
- 사건·사고·선거 기사는 특히 인명·수치·날짜를 정확히 유지합니다.
- 정치 기사는 특정 진영에 치우치지 않게 중립적으로 요약합니다.
- 출력은 지정된 JSON 형식만 반환하고, 그 외 텍스트(설명·코드펜스)는 절대 포함하지 않습니다.`;

function userPrompt(item) {
  return `다음 뉴스 원문을 요약하세요.

[제목]
${item.title}

[원문]
${item.body_full}

아래 JSON 형식으로만 답하세요:
{
  "ai_headline": "원문 핵심을 담은 25자 이내 한 줄 헤드라인",
  "summary_short": "3~4문장 요약. 모바일에서 읽기 좋게 간결하게.",
  "summary_bullets": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "category_slug": "politics|economy|society|it|world|sports|entertainment 중 하나",
  "entities": [
    { "name": "표준 표기(직함·조사 제거: '이재명 대표'→'이재명')", "type": "person|party|issue|sports|celebrity" }
  ]
}`;
}

async function callOnce(item) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      // OpenRouter 랭킹/식별용(선택)
      "HTTP-Referer": "https://nocut.news",
      "X-Title": "AI Nocut News ingest",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt(item) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content || !content.trim()) throw new Error("빈 응답");
  // 일부 모델이 ```json 펜스를 붙여올 수 있어 제거, 첫 { ~ 마지막 } 구간만 파싱
  const clean = content.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
  const json = s >= 0 && e > s ? clean.slice(s, e + 1) : clean;
  return JSON.parse(fixJsonControlChars(json));
}

// 문자열 값 안에 들어온 생(raw) 제어문자(줄바꿈/탭 등)를 이스케이프 — 표준 JSON.parse가
// 거부하는 케이스 보정. 일부 모델이 summary 문자열에 실제 \n을 넣어 보내는 문제 대응.
function fixJsonControlChars(s) {
  let out = "", inStr = false, esc = false;
  for (const ch of s) {
    if (esc) { out += ch; esc = false; continue; }
    if (ch === "\\") { out += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (inStr) {
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
    }
    out += ch;
  }
  return out;
}

async function summarize(item) {
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await callOnce(item);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// ============================================================
// 토픽 slug 정규화 — 동일 개체 병합(v1: 표시명 기준)
// ============================================================
function slugify(name) {
  return name.trim().replace(/\s+/g, "-").toLowerCase();
}

async function upsertTopic(name, type) {
  const slug = slugify(name);
  const { data: existing } = await sb.from("topics").select("id, mention_count").eq("slug", slug).maybeSingle();
  if (existing) {
    await sb.from("topics").update({ mention_count: (existing.mention_count ?? 0) + 1 }).eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await sb
    .from("topics")
    .insert({ slug, name: name.trim(), type, mention_count: 1 })
    .select("id")
    .single();
  if (error) {
    console.warn(`  토픽 upsert 실패(${slug}): ${error.message}`);
    return null;
  }
  return data.id;
}

// ============================================================
// 메인
// ============================================================
async function main() {
  console.log(`[ingest] RSS 수집 시작 — model=${MODEL}${DRY ? " (dry-run)" : ""}`);

  const xml = await (await fetch(RSS_URL)).text();
  const items = parseNocutRss(xml).slice(0, LIMIT);
  console.log(`[ingest] RSS 항목 ${items.length}건`);

  // 카테고리 slug → id
  const { data: cats } = await sb.from("categories").select("id, slug");
  const catMap = Object.fromEntries((cats ?? []).map((c) => [c.slug, c.id]));
  const societyId = catMap["society"] ?? null;

  // 기존 source_id (중복 skip)
  const ids = items.map((i) => i.source_id);
  const { data: existingRows } = await sb.from("articles").select("source_id").in("source_id", ids);
  const existing = new Set((existingRows ?? []).map((r) => r.source_id));

  let inserted = 0, skipped = 0, failed = 0;

  for (const item of items) {
    if (existing.has(item.source_id)) {
      skipped++;
      continue;
    }

    let summary = null;
    try {
      summary = await summarize(item);
    } catch (e) {
      failed++;
      console.warn(`  요약 실패 [${item.source_id}] ${item.title.slice(0, 30)}… — ${e.message}`);
    }

    const row = {
      source_id: item.source_id,
      title: item.title,
      original_url: item.original_url,
      body_full: item.body_full,
      thumbnail_url: item.thumbnail_url,
      published_at: item.published_at,
      status: "published",
      ai_headline: summary?.ai_headline ?? null,
      summary_short: summary?.summary_short ?? null,
      summary_bullets: summary?.summary_bullets ?? null,
      category_id: summary ? catMap[summary.category_slug] ?? societyId : societyId,
    };

    if (DRY) {
      console.log(`  [dry] ${row.ai_headline || row.title}`);
      inserted++;
      continue;
    }

    const { data: art, error } = await sb
      .from("articles")
      .upsert(row, { onConflict: "source_id" })
      .select("id")
      .single();
    if (error) {
      console.error(`  적재 실패 [${item.source_id}]: ${error.message}`);
      continue;
    }
    inserted++;

    // 토픽 적재
    for (const ent of summary?.entities ?? []) {
      const topicId = await upsertTopic(ent.name, ent.type);
      if (topicId) {
        await sb.from("article_topics").upsert(
          { article_id: art.id, topic_id: topicId, relevance: 1.0 },
          { onConflict: "article_id,topic_id" },
        );
      }
    }
    console.log(`  ✓ ${row.ai_headline || row.title}`);
  }

  console.log(`[ingest] 완료 — 신규 ${inserted} · 중복 ${skipped} · 요약실패 ${failed}`);

  if (!DRY && !NO_PRUNE) await prune();
}

// ============================================================
// 보존 정책 — RETENTION_DAYS 지난 RSS 기사 정리 (무료 티어 용량 유지)
// ============================================================
async function prune() {
  if (!Number.isFinite(RETENTION_DAYS) || RETENTION_DAYS < 0) {
    console.warn(`[prune] RETENTION_DAYS 값이 올바르지 않아 건너뜀: ${process.env.RETENTION_DAYS}`);
    return;
  }
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400_000).toISOString();

  // 수기 기사(source_type='manual')는 보호, RSS만 정리. article_topics는 FK cascade로 자동 정리됨.
  const { data: deleted, error } = await sb
    .from("articles")
    .delete()
    .lt("published_at", cutoff)
    .eq("source_type", "rss")
    .select("id");
  if (error) {
    console.warn(`[prune] 기사 정리 실패: ${error.message}`);
    return;
  }
  console.log(`[prune] ${RETENTION_DAYS}일 경과 기사 ${deleted?.length ?? 0}건 삭제`);

  // 매핑이 모두 사라져 고아가 된 토픽 정리 (트렌딩 왜곡 방지). 실패해도 비치명적.
  const { data: used } = await sb.from("article_topics").select("topic_id");
  const usedIds = new Set((used ?? []).map((r) => r.topic_id));
  const { data: allTopics } = await sb.from("topics").select("id");
  const orphans = (allTopics ?? []).map((t) => t.id).filter((id) => !usedIds.has(id));
  if (orphans.length > 0) {
    const { error: oErr } = await sb.from("topics").delete().in("id", orphans);
    if (oErr) console.warn(`[prune] 고아 토픽 정리 실패: ${oErr.message}`);
    else console.log(`[prune] 고아 토픽 ${orphans.length}건 삭제`);
  }
}

main().catch((e) => {
  console.error("[ingest] 치명적 오류:", e);
  process.exit(1);
});
