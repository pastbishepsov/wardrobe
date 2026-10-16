-- Гардероб: схема базы. Выполнить один раз в Supabase → SQL Editor.
-- Приложение ходит в базу только с сервера (service role key), поэтому RLS включён без политик:
-- анонимный/публичный доступ закрыт полностью.

create extension if not exists pgcrypto;

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  category text not null check (category in ('top','bottom','dress','outerwear','shoes','bag','accessory')),
  subcategory text,
  colors text[] not null default '{}',
  pattern text,
  material text,
  seasons text[] not null default '{}',
  warmth int not null default 3 check (warmth between 1 and 5),
  formality int not null default 3 check (formality between 1 and 5),
  style_tags text[] not null default '{}',
  brand text,
  notes text,
  image_path text not null,
  original_path text,
  width int,
  height int,
  archived boolean not null default false
);

create table if not exists outfits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  kind text not null default 'collage' check (kind in ('collage','tryon')),
  item_ids uuid[] not null default '{}',
  layout jsonb not null default '{}'::jsonb,
  occasion text
);

create table if not exists wears (
  id uuid primary key default gen_random_uuid(),
  worn_on date not null default current_date,
  outfit_id uuid references outfits(id) on delete set null,
  item_ids uuid[] not null default '{}'
);

create table if not exists tryon_profile (
  id int primary key default 1 check (id = 1),
  photo_path text,
  zones jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists item_placements (
  item_id uuid primary key references items(id) on delete cascade,
  dx double precision not null default 0,
  dy double precision not null default 0,
  scale double precision not null default 1,
  rotation double precision not null default 0
);

create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null,
  payload jsonb not null
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  city text not null,
  country text,
  lat double precision not null,
  lon double precision not null,
  start_date date not null,
  end_date date not null,
  purpose text not null default 'mixed',
  activities text[] not null default '{}',
  weather jsonb,
  plan jsonb,
  packed uuid[] not null default '{}'
);

create index if not exists items_category_idx on items (category) where archived = false;
create index if not exists wears_worn_on_idx on wears (worn_on desc);

alter table items enable row level security;
alter table outfits enable row level security;
alter table wears enable row level security;
alter table tryon_profile enable row level security;
alter table item_placements enable row level security;
alter table insights enable row level security;
alter table trips enable row level security;

-- Приватный бакет для фото (вырезанные вещи, оригиналы, фото для примерки).
insert into storage.buckets (id, name, public, file_size_limit)
values ('wardrobe', 'wardrobe', false, 10485760)
on conflict (id) do nothing;
