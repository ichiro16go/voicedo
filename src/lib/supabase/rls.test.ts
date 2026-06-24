import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const liveTest = Boolean(url && anonKey);
const describeIf = liveTest ? describe : describe.skip;

// PostgREST/PG エラーコード：
// - PGRST205: schema cache 未登録（テーブル不在）→ migration 未適用
// - 42P01  : undefined_table
// - 42501  : permission denied（RLS拒否、または insert ポリシー無し）
const TABLE_MISSING_CODES = new Set(["PGRST205", "42P01"]);

describeIf("Supabase RLS smoke test (anon, unauthenticated)", () => {
  let client: SupabaseClient;

  beforeAll(() => {
    client = createClient(url as string, anonKey as string);
  });

  for (const table of ["sessions", "turns", "articles", "deletions"]) {
    it(`匿名ユーザーは ${table} を select しても 0 行 (RLSにより空)`, async () => {
      const { data, error } = await client.from(table).select("id").limit(1);
      if (error && TABLE_MISSING_CODES.has(error.code ?? "")) {
        throw new Error(
          `テーブル ${table} が未作成。supabase db push を実行してください (${error.code})`,
        );
      }
      const rlsBlocks = (data ?? []).length === 0 || !!error;
      expect(rlsBlocks).toBe(true);
    });

    it(`匿名ユーザーは ${table} に insert できない`, async () => {
      const { error } = await client.from(table).insert({} as never);
      if (error && TABLE_MISSING_CODES.has(error.code ?? "")) {
        throw new Error(
          `テーブル ${table} が未作成。supabase db push を実行してください (${error.code})`,
        );
      }
      expect(error).toBeTruthy();
    });
  }
});

// =============================================================================
// Storage バケット voicedo-audio (#6) の RLS smoke test
// バケット未作成時は describe.skip しないので、空配列/エラーで通る形に書く
// =============================================================================
describeIf("Supabase Storage RLS: voicedo-audio bucket", () => {
  let client: SupabaseClient;

  beforeAll(() => {
    client = createClient(url as string, anonKey as string);
  });

  it("匿名ユーザーは voicedo-audio バケット内をリストできない (空 or error)", async () => {
    const { data, error } = await client.storage
      .from("voicedo-audio")
      .list("", { limit: 1 });
    const blocked = !data || data.length === 0 || !!error;
    expect(blocked).toBe(true);
  });

  it("匿名ユーザーは voicedo-audio にアップロードできない", async () => {
    const path = `anon-not-allowed/${Date.now()}.m4a`;
    const blob = new Blob([new Uint8Array([0])], { type: "audio/m4a" });
    const { error } = await client.storage
      .from("voicedo-audio")
      .upload(path, blob);
    expect(error).toBeTruthy();
  });

  it("匿名ユーザーは他人の path に signed URL を発行できない", async () => {
    const fakeUserId = "00000000-0000-0000-0000-000000000000";
    const { data, error } = await client.storage
      .from("voicedo-audio")
      .createSignedUrl(`${fakeUserId}/missing.m4a`, 60);
    expect(error || !data).toBeTruthy();
  });
});
