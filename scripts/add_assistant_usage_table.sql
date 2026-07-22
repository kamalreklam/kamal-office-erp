create table if not exists assistant_usage (
  id text primary key default 'default',
  prompt_tokens bigint not null default 0,
  completion_tokens bigint not null default 0,
  total_tokens bigint not null default 0,
  request_count bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into assistant_usage (id) values ('default')
on conflict (id) do nothing;

-- RLS allow-all, matching every other table in this app: there is no auth
-- system, so the anon key is used for every read/write. This satisfies
-- Supabase's linter without changing actual access (still open, as before).
alter table assistant_usage enable row level security;

create policy "allow all on assistant_usage"
on assistant_usage
for all
to anon, authenticated
using (true)
with check (true);
