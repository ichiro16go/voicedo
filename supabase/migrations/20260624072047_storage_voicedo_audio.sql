-- Voicedo Storage: 録音音声バケット
-- 関連: Issue #6 / #3 (録音画面)
-- 仕様: private バケット、本人のみ R/W、UPDATE禁止、50MB上限
-- パス規約: {user_id}/{session_id}.{ext}  (m4a / mp4 を想定)

-- =====================================================
-- 1. バケット作成 (idempotent)
-- =====================================================
-- public = false: anon URL では参照不可、Signed URL or 認証API経由のみ
-- file_size_limit: 50MB = 52,428,800 bytes
-- allowed_mime_types: 音声のみ
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voicedo-audio',
  'voicedo-audio',
  false,
  52428800,
  array['audio/m4a','audio/mp4','audio/mpeg','audio/aac','audio/x-m4a']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- =====================================================
-- 2. RLS ポリシー (storage.objects は元から RLS enabled)
-- =====================================================
-- パス先頭セグメント = user_id を所有チェックの基準にする
-- ref: https://supabase.com/docs/guides/storage/security/access-control

-- 既存（再 apply 用）ポリシーを掃除
drop policy if exists "voicedo_audio_select_own" on storage.objects;
drop policy if exists "voicedo_audio_insert_own" on storage.objects;
drop policy if exists "voicedo_audio_delete_own" on storage.objects;
drop policy if exists "voicedo_audio_no_update"  on storage.objects;

-- SELECT: 自分の user_id フォルダ配下のみ
create policy "voicedo_audio_select_own" on storage.objects
  for select
  using (
    bucket_id = 'voicedo-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- INSERT: 自分の user_id フォルダ配下のみ
create policy "voicedo_audio_insert_own" on storage.objects
  for insert
  with check (
    bucket_id = 'voicedo-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE: 自分の user_id フォルダ配下のみ
create policy "voicedo_audio_delete_own" on storage.objects
  for delete
  using (
    bucket_id = 'voicedo-audio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE: 音声は immutable → 全面禁止 (using false)
create policy "voicedo_audio_no_update" on storage.objects
  for update
  using (
    bucket_id = 'voicedo-audio'
    and false
  );
