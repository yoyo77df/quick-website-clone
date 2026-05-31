-- @admin mention flag + admin chat-join + delete cascade

alter table public.messages add column if not exists mentions_admin boolean not null default false;
create index if not exists messages_mentions_admin_idx on public.messages(mentions_admin, created_at desc) where mentions_admin = true;

create or replace function public.flag_admin_mention()
returns trigger language plpgsql as $$
begin
  if new.content ~* '(^|[^a-z0-9_])@admin($|[^a-z0-9_])' then
    new.mentions_admin := true;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_flag_admin on public.messages;
create trigger messages_flag_admin
before insert on public.messages
for each row execute function public.flag_admin_mention();

-- allow admins to send messages in any chat
drop policy if exists "messages_insert_admin" on public.messages;
create policy "messages_insert_admin" on public.messages for insert to authenticated
with check (auth.uid() = sender_id and public.has_role(auth.uid(),'admin'));
