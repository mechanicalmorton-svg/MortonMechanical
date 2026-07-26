-- Booking as workflow coordinator: link bookings ↔ customer vehicles ↔ work orders.
-- Safe to re-run.

alter table public.bookings
  add column if not exists customer_vehicle_id text,
  add column if not exists work_order_id text,
  add column if not exists assigned_to text,
  add column if not exists location_type text,
  add column if not exists problem_description text,
  add column if not exists duration_minutes int default 60;

alter table public.work_orders
  add column if not exists booking_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_customer_vehicle_id_fkey'
  ) then
    alter table public.bookings
      add constraint bookings_customer_vehicle_id_fkey
      foreign key (customer_vehicle_id) references public.customer_vehicles(id) on delete set null;
  end if;
exception
  when undefined_table then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bookings_work_order_id_fkey'
  ) then
    alter table public.bookings
      add constraint bookings_work_order_id_fkey
      foreign key (work_order_id) references public.work_orders(id) on delete set null;
  end if;
exception
  when undefined_table then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'work_orders_booking_id_fkey'
  ) then
    alter table public.work_orders
      add constraint work_orders_booking_id_fkey
      foreign key (booking_id) references public.bookings(id) on delete set null;
  end if;
exception
  when undefined_table then null;
end $$;

create index if not exists bookings_customer_vehicle_idx on public.bookings (customer_vehicle_id);
create index if not exists bookings_work_order_idx on public.bookings (work_order_id);
create index if not exists bookings_assigned_to_idx on public.bookings (assigned_to);
create index if not exists work_orders_booking_idx on public.work_orders (booking_id);

comment on column public.bookings.customer_vehicle_id is 'Customer vehicle (customer_vehicles) for this appointment';
comment on column public.bookings.work_order_id is 'Work order spawned/linked by booking orchestration';
comment on column public.bookings.assigned_to is 'Technician staff id (same convention as work_orders.assigned_to)';
comment on column public.bookings.location_type is 'home | work | business | apartment | roadside | other';
comment on column public.work_orders.booking_id is 'Originating booking when created via workflow orchestration';
