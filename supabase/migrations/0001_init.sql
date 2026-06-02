create extension if not exists "pgcrypto";

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references public.households(id),
  role text not null default 'member' check (role in ('member', 'editor', 'admin')),
  is_superadmin boolean not null default false,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);

create table public.dishes (
  household_id uuid not null references public.households(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (household_id, id)
);

create table public.ingredients (
  household_id uuid not null references public.households(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (household_id, id)
);

create table public.staples (
  household_id uuid not null references public.households(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (household_id, id)
);

create table public.pantry_items (
  household_id uuid not null references public.households(id) on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (household_id, id)
);

create table public.weekly_plans (
  household_id uuid not null references public.households(id) on delete cascade,
  week_start text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (household_id, week_start)
);

create table public.meal_slots (
  household_id uuid not null references public.households(id) on delete cascade,
  week_start text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (household_id, week_start, id),
  foreign key (household_id, week_start)
    references public.weekly_plans(household_id, week_start) on delete cascade
);

create table public.household_settings (
  household_id uuid primary key references public.households(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_superadmin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, new.raw_user_meta_data->>'name', new.email);

  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end
$$;

create trigger dishes_touch_updated_at
  before update on public.dishes
  for each row execute function public.touch_updated_at();

create trigger ingredients_touch_updated_at
  before update on public.ingredients
  for each row execute function public.touch_updated_at();

create trigger staples_touch_updated_at
  before update on public.staples
  for each row execute function public.touch_updated_at();

create trigger pantry_items_touch_updated_at
  before update on public.pantry_items
  for each row execute function public.touch_updated_at();

create trigger weekly_plans_touch_updated_at
  before update on public.weekly_plans
  for each row execute function public.touch_updated_at();

create trigger meal_slots_touch_updated_at
  before update on public.meal_slots
  for each row execute function public.touch_updated_at();

create trigger household_settings_touch_updated_at
  before update on public.household_settings
  for each row execute function public.touch_updated_at();

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.dishes enable row level security;
alter table public.ingredients enable row level security;
alter table public.staples enable row level security;
alter table public.pantry_items enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.meal_slots enable row level security;
alter table public.household_settings enable row level security;

create policy "profiles read own profile"
  on public.profiles
  for select
  using (id = auth.uid());

create policy "profiles update own safe fields"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.current_role()
    and household_id is not distinct from public.current_household_id()
    and is_superadmin = public.current_is_superadmin()
  );

create policy "profiles household admin reads household profiles"
  on public.profiles
  for select
  using (
    household_id = public.current_household_id()
    and public.current_role() = 'admin'
  );

create policy "profiles household admin updates household profiles"
  on public.profiles
  for update
  using (
    household_id = public.current_household_id()
    and public.current_role() = 'admin'
  )
  with check (
    household_id = public.current_household_id()
    and role in ('member', 'editor', 'admin')
    and is_superadmin = false
  );

create policy "profiles superadmin reads all profiles"
  on public.profiles
  for select
  using (public.current_is_superadmin());

create policy "households read own household"
  on public.households
  for select
  using (id = public.current_household_id());

create policy "households admin updates own household"
  on public.households
  for update
  using (
    id = public.current_household_id()
    and public.current_role() = 'admin'
  )
  with check (
    id = public.current_household_id()
    and public.current_role() = 'admin'
  );

create policy "households superadmin reads all households"
  on public.households
  for select
  using (public.current_is_superadmin());

create policy "dishes member reads own household"
  on public.dishes
  for select
  using (household_id = public.current_household_id());

create policy "dishes editor admin writes own household"
  on public.dishes
  for all
  using (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  )
  with check (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  );

create policy "dishes superadmin reads all households"
  on public.dishes
  for select
  using (public.current_is_superadmin());

create policy "ingredients member reads own household"
  on public.ingredients
  for select
  using (household_id = public.current_household_id());

create policy "ingredients editor admin writes own household"
  on public.ingredients
  for all
  using (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  )
  with check (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  );

create policy "ingredients superadmin reads all households"
  on public.ingredients
  for select
  using (public.current_is_superadmin());

create policy "staples member reads own household"
  on public.staples
  for select
  using (household_id = public.current_household_id());

create policy "staples editor admin writes own household"
  on public.staples
  for all
  using (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  )
  with check (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  );

create policy "staples superadmin reads all households"
  on public.staples
  for select
  using (public.current_is_superadmin());

create policy "pantry_items member reads own household"
  on public.pantry_items
  for select
  using (household_id = public.current_household_id());

create policy "pantry_items editor admin writes own household"
  on public.pantry_items
  for all
  using (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  )
  with check (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  );

create policy "pantry_items superadmin reads all households"
  on public.pantry_items
  for select
  using (public.current_is_superadmin());

create policy "weekly_plans member reads own household"
  on public.weekly_plans
  for select
  using (household_id = public.current_household_id());

create policy "weekly_plans editor admin writes own household"
  on public.weekly_plans
  for all
  using (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  )
  with check (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  );

create policy "weekly_plans superadmin reads all households"
  on public.weekly_plans
  for select
  using (public.current_is_superadmin());

create policy "meal_slots member reads own household"
  on public.meal_slots
  for select
  using (household_id = public.current_household_id());

create policy "meal_slots editor admin writes own household"
  on public.meal_slots
  for all
  using (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  )
  with check (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  );

create policy "meal_slots superadmin reads all households"
  on public.meal_slots
  for select
  using (public.current_is_superadmin());

create policy "household_settings member reads own household"
  on public.household_settings
  for select
  using (household_id = public.current_household_id());

create policy "household_settings editor admin writes own household"
  on public.household_settings
  for all
  using (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  )
  with check (
    household_id = public.current_household_id()
    and public.current_role() in ('admin', 'editor')
  );

create policy "household_settings superadmin reads all households"
  on public.household_settings
  for select
  using (public.current_is_superadmin());

create or replace function public.import_household_data(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household uuid;
  current_household uuid;
  entry jsonb;
begin
  if not (public.current_role() = 'admin' or public.current_is_superadmin()) then
    raise exception 'Only household admins or platform superadmins can import household data.';
  end if;

  if coalesce((payload->>'version')::integer, 0) <> 1 then
    raise exception 'Unsupported backup version. Expected version 1.';
  end if;

  target_household := (payload->>'householdId')::uuid;
  current_household := public.current_household_id();

  if target_household is null then
    raise exception 'householdId is required.';
  end if;

  if not public.current_is_superadmin() and target_household <> current_household then
    raise exception 'This backup belongs to a different household and cannot be imported here.';
  end if;

  if (payload->'household'->>'id')::uuid <> target_household then
    raise exception 'Backup household id does not match householdId.';
  end if;

  insert into public.households (id, name, created_by)
  values (
    target_household,
    payload->'household'->>'name',
    nullif(payload->'household'->>'ownerUid', '')::uuid
  )
  on conflict (id) do update
    set name = excluded.name;

  for entry in select * from jsonb_array_elements(coalesce(payload->'profiles', '[]'::jsonb))
  loop
    if (entry->>'householdId')::uuid <> target_household then
      raise exception 'Backup profiles must stay inside the target household.';
    end if;

    if entry->>'role' not in ('member', 'editor', 'admin') then
      raise exception 'Profile role must be member, editor, or admin.';
    end if;

    insert into public.profiles (id, display_name, email, role, household_id, is_superadmin)
    values (
      (entry->>'uid')::uuid,
      entry->>'displayName',
      entry->>'email',
      entry->>'role',
      target_household,
      false
    )
    on conflict (id) do update
      set display_name = excluded.display_name,
          email = excluded.email,
          role = excluded.role,
          household_id = excluded.household_id,
          is_superadmin = false;
  end loop;

  if payload ? 'settings' and payload->'settings' <> 'null'::jsonb then
    insert into public.household_settings (household_id, data, updated_by)
    values (target_household, payload->'settings', auth.uid())
    on conflict (household_id) do update
      set data = excluded.data,
          updated_by = auth.uid();
  end if;

  for entry in select * from jsonb_array_elements(coalesce(payload->'dishes', '[]'::jsonb))
  loop
    insert into public.dishes (household_id, id, data, updated_by)
    values (target_household, entry->>'id', entry, auth.uid())
    on conflict (household_id, id) do update
      set data = excluded.data,
          updated_by = auth.uid();
  end loop;

  for entry in select * from jsonb_array_elements(coalesce(payload->'ingredients', '[]'::jsonb))
  loop
    insert into public.ingredients (household_id, id, data, updated_by)
    values (target_household, entry->>'id', entry, auth.uid())
    on conflict (household_id, id) do update
      set data = excluded.data,
          updated_by = auth.uid();
  end loop;

  for entry in select * from jsonb_array_elements(coalesce(payload->'staples', '[]'::jsonb))
  loop
    insert into public.staples (household_id, id, data, updated_by)
    values (target_household, entry->>'id', entry, auth.uid())
    on conflict (household_id, id) do update
      set data = excluded.data,
          updated_by = auth.uid();
  end loop;

  for entry in select * from jsonb_array_elements(coalesce(payload->'pantryItems', '[]'::jsonb))
  loop
    insert into public.pantry_items (household_id, id, data, updated_by)
    values (target_household, entry->>'id', entry, auth.uid())
    on conflict (household_id, id) do update
      set data = excluded.data,
          updated_by = auth.uid();
  end loop;

  for entry in select * from jsonb_array_elements(coalesce(payload->'weeklyPlans', '[]'::jsonb))
  loop
    insert into public.weekly_plans (household_id, week_start, data, updated_by)
    values (target_household, entry->>'weekStart', entry, auth.uid())
    on conflict (household_id, week_start) do update
      set data = excluded.data,
          updated_by = auth.uid();
  end loop;

  for entry in select * from jsonb_array_elements(coalesce(payload->'mealSlots', '[]'::jsonb))
  loop
    insert into public.meal_slots (household_id, week_start, id, data, updated_by)
    values (target_household, entry->>'planId', entry->>'id', entry, auth.uid())
    on conflict (household_id, week_start, id) do update
      set data = excluded.data,
          updated_by = auth.uid();
  end loop;

  return;
end
$$;
