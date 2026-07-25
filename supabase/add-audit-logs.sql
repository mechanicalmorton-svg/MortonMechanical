-- Enterprise audit logs (append-only). Run in Supabase SQL Editor.
-- App writes via service role only. No policies for anon/authenticated.

create table if not exists audit_logs (
  id text primary key,
  created_at timestamptz not null default now(),
  actor_user_id text,
  actor_name text default '',
  actor_email text default '',
  actor_role text default '',
  actor_avatar_url text,
  actor_kind text not null default 'system',
  module text not null,
  page text default '',
  action text not null,
  description text not null default '',
  severity text not null default 'info',
  status text not null default 'success',
  record_type text default '',
  record_id text default '',
  record_label text default '',
  old_value jsonb,
  new_value jsonb,
  changed_fields text[] default '{}',
  ip_address text default '',
  user_agent text default '',
  device text default '',
  browser text default '',
  os text default '',
  session_id text default '',
  shop_id text,
  search_text text not null default '',
  notes text default '',
  metadata jsonb default '{}'::jsonb
);

comment on table audit_logs is 'Immutable enterprise audit trail. Application must never UPDATE or DELETE rows.';

create index if not exists audit_logs_created_at_idx on audit_logs (created_at desc);
create index if not exists audit_logs_module_action_idx on audit_logs (module, action);
create index if not exists audit_logs_record_idx on audit_logs (record_type, record_id, created_at desc);
create index if not exists audit_logs_actor_idx on audit_logs (actor_user_id);
create index if not exists audit_logs_severity_idx on audit_logs (severity);
create index if not exists audit_logs_status_idx on audit_logs (status);
create index if not exists audit_logs_search_text_idx on audit_logs using gin (to_tsvector('english', coalesce(search_text, '')));

alter table audit_logs enable row level security;
-- Intentionally no grants/policies for anon/authenticated — service role only.
