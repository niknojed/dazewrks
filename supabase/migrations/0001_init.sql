-- Notebook schema
-- Every piece of work is a document (a month of notes, a script, a music workspace, a book).
-- Documents have one owner and optional members, so collaborators and shared credits can
-- be added later without migrating data.

create extension if not exists pgcrypto;

-- Profiles -------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  settings jsonb not null default '{}'::jsonb, -- { works: {script,music,book}, theme, reflectDay, eventsDone }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documents ------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('month', 'script', 'music', 'book')),
  key text not null,                -- '10.26' for a month, 'main' or a slug for projects
  title text not null default '',
  status text not null default 'draft' check (status in ('draft', 'finished')),
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, kind, key)
);
create index if not exists documents_owner_kind_idx on public.documents (owner_id, kind, updated_at desc);

-- Members (future collaborators and credits) -------------------------------------
create table if not exists public.document_members (
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'viewer' check (role in ('editor', 'viewer')),
  credit text,                      -- e.g. 'Co-writer', 'Illustrator'
  created_at timestamptz not null default now(),
  primary key (document_id, user_id)
);

-- updated_at + version bump --------------------------------------------------
create or replace function public.touch_row() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if tg_table_name = 'documents' then
    new.version := coalesce(old.version, 0) + 1;
  end if;
  return new;
end $$;

create or replace function public.lock_document_identity() returns trigger
language plpgsql as $$
begin
  if new.owner_id <> old.owner_id or new.kind <> old.kind or new.key <> old.key then
    raise exception 'owner, kind and key cannot change';
  end if;
  return new;
end $$;

drop trigger if exists documents_lock_identity on public.documents;
create trigger documents_lock_identity before update on public.documents
  for each row execute function public.lock_document_identity();

drop trigger if exists documents_touch on public.documents;
create trigger documents_touch before update on public.documents
  for each row execute function public.touch_row();
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_row();

-- Create a profile on sign-up --------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, settings)
  values (new.id, coalesce(split_part(new.email, '@', 1), ''),
          '{"works":{"script":true,"music":true,"book":true},"theme":"light","reflectDay":"Sunday","eventsDone":{}}'::jsonb)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security -----------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_members enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.is_member(doc uuid, roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.document_members m
    where m.document_id = doc and m.user_id = auth.uid() and m.role = any (roles)
  );
$$;

drop policy if exists "read own or shared" on public.documents;
create policy "read own or shared" on public.documents
  for select using (owner_id = auth.uid() or public.is_member(id, array['editor', 'viewer']));

drop policy if exists "insert own" on public.documents;
create policy "insert own" on public.documents
  for insert with check (owner_id = auth.uid());

drop policy if exists "update own or editor" on public.documents;
create policy "update own or editor" on public.documents
  for update using (owner_id = auth.uid() or public.is_member(id, array['editor']))
  with check (owner_id = auth.uid() or public.is_member(id, array['editor']));

drop policy if exists "delete own" on public.documents;
create policy "delete own" on public.documents
  for delete using (owner_id = auth.uid());

drop policy if exists "owner manages members" on public.document_members;
create policy "owner manages members" on public.document_members
  for all using (exists (select 1 from public.documents d where d.id = document_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.documents d where d.id = document_id and d.owner_id = auth.uid()));

drop policy if exists "members see themselves" on public.document_members;
create policy "members see themselves" on public.document_members
  for select using (user_id = auth.uid());

-- Storage: private bucket, one folder per user ------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "media read own" on storage.objects;
create policy "media read own" on storage.objects
  for select using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media write own" on storage.objects;
create policy "media write own" on storage.objects
  for insert with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media update own" on storage.objects;
create policy "media update own" on storage.objects
  for update using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media delete own" on storage.objects;
create policy "media delete own" on storage.objects
  for delete using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
