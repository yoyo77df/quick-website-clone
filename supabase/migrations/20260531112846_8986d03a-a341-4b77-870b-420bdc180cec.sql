-- ============ ENUMS ============
create type public.user_category as enum ('player','coach','team_manager','caster');
create type public.app_role as enum ('admin','user');
create type public.game_code as enum ('valorant','lol','cs2','dota2','ow2','apex','freefire','pubg');
create type public.report_status as enum ('open','resolved','dismissed');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  bio text default '',
  avatar_url text,
  category public.user_category not null,
  games public.game_code[] not null default '{}',
  social_links jsonb not null default '{}'::jsonb,
  is_online boolean not null default false,
  last_seen timestamptz not null default now(),
  is_banned boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id);

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create policy "user_roles_select_own_or_admin" on public.user_roles for select to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create policy "profiles_admin_update" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "profiles_admin_delete" on public.profiles for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ POSTS ============
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  game public.game_code not null,
  skill_role text not null default '',
  availability text not null default '',
  social_links jsonb not null default '{}'::jsonb,
  image_url text,
  created_at timestamptz not null default now()
);
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;

create policy "posts_select_all" on public.posts for select using (true);
create policy "posts_insert_own" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "posts_update_own_or_admin" on public.posts for update to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "posts_delete_own_or_admin" on public.posts for delete to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create index posts_game_idx on public.posts(game);
create index posts_user_idx on public.posts(user_id);

-- ============ CHATS ============
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint chats_distinct_pair check (user_a < user_b),
  unique (user_a, user_b)
);
grant select, insert on public.chats to authenticated;
grant all on public.chats to service_role;
alter table public.chats enable row level security;

create policy "chats_select_participant_or_admin" on public.chats for select to authenticated
using (auth.uid() = user_a or auth.uid() = user_b or public.has_role(auth.uid(),'admin'));
create policy "chats_insert_participant" on public.chats for insert to authenticated
with check (auth.uid() = user_a or auth.uid() = user_b);

-- ============ MESSAGES ============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;

create policy "messages_select_participant_or_admin" on public.messages for select to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.chats c where c.id = chat_id and (c.user_a = auth.uid() or c.user_b = auth.uid()))
);
create policy "messages_insert_participant" on public.messages for insert to authenticated
with check (
  auth.uid() = sender_id and exists (
    select 1 from public.chats c where c.id = chat_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
  )
);

create index messages_chat_idx on public.messages(chat_id, created_at);

-- ============ REPORTS ============
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);
grant select, insert on public.reports to authenticated;
grant update, delete on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;

create policy "reports_insert_self" on public.reports for insert to authenticated with check (auth.uid() = reporter_id);
create policy "reports_select_own_or_admin" on public.reports for select to authenticated
using (auth.uid() = reporter_id or public.has_role(auth.uid(),'admin'));
create policy "reports_update_admin" on public.reports for update to authenticated using (public.has_role(auth.uid(),'admin'));

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update to authenticated using (auth.uid() = user_id);

-- ============ TRIGGER ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
  v_category public.user_category;
begin
  v_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1));
  v_category := coalesce((new.raw_user_meta_data->>'category')::public.user_category, 'player');
  if exists(select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || substr(new.id::text,1,6);
  end if;
  insert into public.profiles (id, username, category) values (new.id, v_username, v_category);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ STORAGE ============
insert into storage.buckets (id, name, public) values ('avatars','avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('post-images','post-images', true) on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_user_write" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_user_update" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_user_delete" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "posts_public_read" on storage.objects for select using (bucket_id = 'post-images');
create policy "posts_user_write" on storage.objects for insert to authenticated
with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "posts_user_delete" on storage.objects for delete to authenticated
using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============ REALTIME ============
alter table public.messages replica identity full;
alter table public.posts replica identity full;
alter table public.chats replica identity full;
alter table public.profiles replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end$$;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.chats;
alter publication supabase_realtime add table public.profiles;

revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to service_role;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;