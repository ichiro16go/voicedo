-- Voicedo 初期スキーマ
-- tech-stack.md「スキーマ初版（Stage 1用）」に対応
-- ポリシー: RLSで自分のレコードのみアクセス可能。音声は7日で自動削除。

create extension if not exists "pgcrypto";

-- =====================================================
-- sessions: 録音セッション
-- =====================================================
create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  audio_path   text,                   -- Supabase Storage 内のパス
  transcript   text,                   -- STT結果
  persona      text not null check (persona in ('hal', 'roi')),
  status       text not null default 'recording'
               check (status in ('recording','transcribing','generating','ready','failed')),
  created_at   timestamptz not null default now()
);
create index on public.sessions (user_id, created_at desc);

-- =====================================================
-- turns: 1セッション内の対話ターン
-- =====================================================
create table public.turns (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  turn_index  int  not null,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  created_at  timestamptz not null default now(),
  unique (session_id, turn_index)
);
create index on public.turns (session_id, turn_index);

-- =====================================================
-- articles: 生成記事
-- =====================================================
create table public.articles (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body_md     text not null,
  status      text not null default 'draft'
              check (status in ('draft','user_edited','exported')),
  model       text not null,
  created_at  timestamptz not null default now()
);
create index on public.articles (user_id, created_at desc);

-- =====================================================
-- deletions: 即時削除と遅延削除の追跡（plan.md L199）
-- =====================================================
create table public.deletions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  requested_at        timestamptz not null default now(),
  immediate_done_at   timestamptz,
  delayed_done_at     timestamptz,
  scope               text not null default 'all'
                      check (scope in ('all','sessions_only','articles_only'))
);
create index on public.deletions (user_id);

-- =====================================================
-- billing_events: Stripe webhook受信ログ
-- =====================================================
create table public.billing_events (
  id              uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  user_id         uuid references auth.users(id) on delete set null,
  type            text not null,
  payload         jsonb not null,
  received_at     timestamptz not null default now()
);
create index on public.billing_events (user_id, received_at desc);

-- =====================================================
-- Row Level Security
-- =====================================================
alter table public.sessions       enable row level security;
alter table public.turns          enable row level security;
alter table public.articles       enable row level security;
alter table public.deletions      enable row level security;
alter table public.billing_events enable row level security;

-- sessions: 本人のみ
create policy "sessions_owner" on public.sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- turns: そのsessionの持ち主のみ
create policy "turns_owner" on public.turns
  for all using (
    exists (select 1 from public.sessions s where s.id = turns.session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.sessions s where s.id = turns.session_id and s.user_id = auth.uid())
  );

-- articles: 本人のみ
create policy "articles_owner" on public.articles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- deletions: 本人のみ参照可、INSERTのみ許可
create policy "deletions_owner_read" on public.deletions
  for select using (user_id = auth.uid());
create policy "deletions_owner_insert" on public.deletions
  for insert with check (user_id = auth.uid());

-- billing_events: 本人参照のみ（書き込みはservice_roleから）
create policy "billing_events_owner_read" on public.billing_events
  for select using (user_id = auth.uid());
