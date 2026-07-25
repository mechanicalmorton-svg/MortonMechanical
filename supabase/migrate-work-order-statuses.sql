-- Map legacy work order statuses onto the expanded shop status set.
-- Safe to re-run.

update work_orders set status = 'draft' where status in ('open', 'pending', 'new');
update work_orders set status = 'in_progress' where status = 'in progress';
update work_orders set status = 'waiting_on_parts' where status in ('waiting on parts', 'waiting_parts');
update work_orders set status = 'waiting_customer' where status in ('waiting customer', 'waiting_on_customer');
update work_orders set status = 'completed' where status = 'complete';
update work_orders set status = 'delivered' where status = 'delivery';
update work_orders set status = 'cancelled' where status in ('canceled', 'cancelled');

alter table work_orders alter column status set default 'draft';
