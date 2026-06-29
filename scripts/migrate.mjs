// Supabase 스키마 마이그레이션 — infra/supabase/migrations/*.sql 을 순서대로 적용.
//
// 실행:
//   node --env-file=apps/web/.env.local scripts/migrate.mjs
//
// 필요 env:
//   SUPABASE_DB_URL — Postgres 연결 문자열
//     Supabase 대시보드 > Project Settings > Database > Connection string (URI).
//     예: postgresql://postgres.xxxx:[PASSWORD]@aws-0-...pooler.supabase.com:5432/postgres
//
// 멱등(idempotent): 마이그레이션 SQL이 모두 `create ... if not exists` / `on conflict do nothing`
// 이므로 반복 실행해도 안전. (Supabase 대시보드 SQL Editor에 직접 붙여넣어도 동일)

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error("✗ 환경변수 누락: SUPABASE_DB_URL");
  console.error("  Supabase 대시보드 > Project Settings > Database > Connection string (URI)");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(here, "..", "infra", "supabase", "migrations");

// 연결 문자열을 직접 분해해 pg에 개별 필드로 전달.
// (비밀번호에 특수문자가 있어도 URL 파서가 깨지지 않도록 인코딩 없이 그대로 넘긴다)
function parseConn(url) {
  const m = url.match(/^postgres(?:ql)?:\/\/([^:]+):([\s\S]*)@([^:/]+):(\d+)\/(.+?)(?:\?.*)?$/);
  if (!m) throw new Error("연결 문자열 형식을 인식하지 못했습니다 (postgresql://user:pass@host:port/db)");
  const [, user, password, host, port, database] = m;
  return { user, password, host, port: Number(port), database };
}

async function main() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) {
    console.error("✗ 마이그레이션 파일 없음:", MIGRATIONS_DIR);
    process.exit(1);
  }

  const client = new pg.Client({ ...parseConn(DB_URL), ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log(`[migrate] 연결 완료 — ${files.length}개 파일 적용`);

  try {
    for (const file of files) {
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      process.stdout.write(`  ${file} … `);
      await client.query(sql);
      console.log("✓");
    }
    console.log("[migrate] 완료");
  } catch (e) {
    console.error(`\n✗ 실패: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
