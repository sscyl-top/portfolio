create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('hiring', 'commercial')),
  name text not null,
  email text not null,
  company text not null default '',
  subject text not null,
  range text not null default '',
  message text not null,
  note text not null,
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  email_notified boolean not null default false,
  email_error text,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

create index contact_messages_ip_hash_created_at_idx
  on public.contact_messages (ip_hash, created_at desc);

alter table public.contact_messages enable row level security;

revoke all on table public.contact_messages from anon, authenticated;
grant select, update, delete on table public.contact_messages to authenticated;

create policy "portfolio owner can read contact messages"
  on public.contact_messages
  for select
  to authenticated
  using ((auth.jwt() ->> 'email') = '3624457672@qq.com');

create policy "portfolio owner can update contact messages"
  on public.contact_messages
  for update
  to authenticated
  using ((auth.jwt() ->> 'email') = '3624457672@qq.com')
  with check ((auth.jwt() ->> 'email') = '3624457672@qq.com');

create policy "portfolio owner can delete contact messages"
  on public.contact_messages
  for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = '3624457672@qq.com');

create or replace function public.set_contact_message_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_contact_message_updated_at
before update on public.contact_messages
for each row execute function public.set_contact_message_updated_at();
