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
