create table if not exists backup_events (
  id bigint generated always as identity primary key,
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  row_id text not null,
  actor_user_id uuid null,
  before_data jsonb null,
  after_data jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists backup_events_table_name_idx on backup_events(table_name);
create index if not exists backup_events_actor_user_id_idx on backup_events(actor_user_id);
create index if not exists backup_events_created_at_idx on backup_events(created_at desc);

create or replace function public.capture_backup_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_text text;
  actor_user uuid;
  new_data jsonb;
  old_data jsonb;
  backup_row_id text;
begin
  if tg_op = 'DELETE' then
    new_data := null;
    old_data := to_jsonb(old);
  else
    new_data := to_jsonb(new);
    old_data := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  end if;

  actor_user_text := coalesce(new_data ->> 'user_id', old_data ->> 'user_id', new_data ->> 'id', old_data ->> 'id');
  if actor_user_text is not null and actor_user_text ~* '^[0-9a-f-]{36}$' then
    actor_user := actor_user_text::uuid;
  else
    actor_user := null;
  end if;

  backup_row_id := coalesce(new_data ->> 'id', old_data ->> 'id', '');

  insert into backup_events (
    table_name,
    operation,
    row_id,
    actor_user_id,
    before_data,
    after_data
  )
  values (
    tg_table_name,
    tg_op,
    backup_row_id,
    actor_user,
    old_data,
    new_data
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists backup_profiles_change on profiles;
create trigger backup_profiles_change
after insert or update or delete on profiles
for each row execute function public.capture_backup_event();

drop trigger if exists backup_motorcycles_change on motorcycles;
create trigger backup_motorcycles_change
after insert or update or delete on motorcycles
for each row execute function public.capture_backup_event();

drop trigger if exists backup_repairs_change on repairs;
create trigger backup_repairs_change
after insert or update or delete on repairs
for each row execute function public.capture_backup_event();

drop trigger if exists backup_payment_entries_change on payment_entries;
create trigger backup_payment_entries_change
after insert or update or delete on payment_entries
for each row execute function public.capture_backup_event();

drop trigger if exists backup_work_orders_change on work_orders;
create trigger backup_work_orders_change
after insert or update or delete on work_orders
for each row execute function public.capture_backup_event();

drop trigger if exists backup_work_order_updates_change on work_order_updates;
create trigger backup_work_order_updates_change
after insert or update or delete on work_order_updates
for each row execute function public.capture_backup_event();
