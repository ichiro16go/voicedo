-- RLS sanity check (適用後に Supabase SQL Editor で実行)
-- 期待: 全てのテーブルで rowsecurity=true、各テーブルに policy が紐づいている

select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       coalesce(p.policies, 0) as policy_count
from pg_class c
left join (
  select polrelid, count(*) as policies
  from pg_policy
  group by polrelid
) p on p.polrelid = c.oid
where c.relnamespace = 'public'::regnamespace
  and c.relname in ('sessions','turns','articles','deletions','billing_events')
order by c.relname;
