alter table inventory add column if not exists sell_price numeric not null default 0;
alter table inventory add column if not exists supplier_link text default '';
