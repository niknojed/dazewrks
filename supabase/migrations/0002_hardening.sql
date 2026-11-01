-- Hardening before real data goes in. Safe to run on top of 0001 and to re-run.

-- Pin search_path on the trigger functions (Supabase security advisor flags this).
alter function public.touch_row() set search_path = public;
alter function public.lock_document_identity() set search_path = public;

-- is_member is security definer: only signed-in users should be able to call it.
revoke execute on function public.is_member(uuid, text[]) from public, anon;
grant execute on function public.is_member(uuid, text[]) to authenticated;

-- Explicit table access: signed-in users only (RLS still decides which rows).
revoke all on public.profiles, public.documents, public.document_members from anon;
grant select, insert, update, delete on public.profiles, public.documents, public.document_members to authenticated;

-- Policies: scope to authenticated and evaluate auth.uid() once per query, not per row.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "read own or shared" on public.documents;
create policy "read own or shared" on public.documents for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_member(id, array['editor', 'viewer']));

drop policy if exists "insert own" on public.documents;
create policy "insert own" on public.documents for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "update own or editor" on public.documents;
create policy "update own or editor" on public.documents for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_member(id, array['editor']))
  with check (owner_id = (select auth.uid()) or public.is_member(id, array['editor']));

drop policy if exists "delete own" on public.documents;
create policy "delete own" on public.documents for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "owner manages members" on public.document_members;
create policy "owner manages members" on public.document_members for all to authenticated
  using (exists (select 1 from public.documents d where d.id = document_id and d.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.documents d where d.id = document_id and d.owner_id = (select auth.uid())));

drop policy if exists "members see themselves" on public.document_members;
create policy "members see themselves" on public.document_members for select to authenticated
  using (user_id = (select auth.uid()));

-- Storage: same per-user folder rule, scoped to authenticated.
drop policy if exists "media read own" on storage.objects;
create policy "media read own" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "media write own" on storage.objects;
create policy "media write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "media update own" on storage.objects;
create policy "media update own" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "media delete own" on storage.objects;
create policy "media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
