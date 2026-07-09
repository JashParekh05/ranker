-- GC Rankings shared schema. Run this in the Supabase SQL editor.

create table if not exists gc_group_chats (
  id uuid primary key,
  name text not null,
  code text not null unique,
  created_at bigint not null
);

create table if not exists gc_people (
  id uuid primary key,
  gc_id uuid not null references gc_group_chats(id) on delete cascade,
  name text not null,
  tag text,
  claimed_by text   -- anonymous device token that claimed this person ("this is me")
);

create table if not exists gc_rankings (
  id uuid primary key,
  gc_id uuid not null references gc_group_chats(id) on delete cascade,
  title text not null,
  "order" text[] not null default '{}',
  prev_order text[] not null default '{}',   -- order before last edit, for movement arrows
  author text not null default 'Anonymous',
  kind text not null default 'category',   -- 'category' | 'personal'
  rater text,                              -- personal ballots: the rater's name; null = prompt marker
  created_at bigint not null,
  updated_at bigint not null
);

create table if not exists gc_revisions (
  id uuid primary key,
  ranking_id uuid not null references gc_rankings(id) on delete cascade,
  gc_id uuid not null references gc_group_chats(id) on delete cascade,
  proposed_by text not null,
  "order" text[] not null default '{}',
  status text not null default 'pending', -- pending | approved | rejected
  created_at bigint not null,
  resolved_at bigint
);

-- If upgrading an existing v1 database, add the new columns:
--   alter table gc_group_chats add column if not exists code text;
--   alter table gc_rankings   add column if not exists author text not null default 'Anonymous';

create index if not exists gc_people_gc_id_idx on gc_people(gc_id);
create index if not exists gc_rankings_gc_id_idx on gc_rankings(gc_id);
create index if not exists gc_revisions_ranking_idx on gc_revisions(ranking_id);
create index if not exists gc_group_chats_code_idx on gc_group_chats(code);

-- Realtime: broadcast row changes to all connected clients.
alter publication supabase_realtime add table gc_group_chats;
alter publication supabase_realtime add table gc_people;
alter publication supabase_realtime add table gc_rankings;
alter publication supabase_realtime add table gc_revisions;

-- Row Level Security.
-- NOTE: this app has NO user auth. Identity is a self-declared name only.
-- These policies let anyone with the site URL read AND write. "Author only
-- approves" is enforced in the UI by name match, NOT by the database, so a
-- determined visitor who types the author's name could self-approve. That is
-- the accepted limit of a no-login app. Add Supabase Auth to harden later.
alter table gc_group_chats enable row level security;
alter table gc_people enable row level security;
alter table gc_rankings enable row level security;
alter table gc_revisions enable row level security;

create policy "public rw group_chats" on gc_group_chats
  for all using (true) with check (true);
create policy "public rw people" on gc_people
  for all using (true) with check (true);
create policy "public rw rankings" on gc_rankings
  for all using (true) with check (true);
create policy "public rw revisions" on gc_revisions
  for all using (true) with check (true);
