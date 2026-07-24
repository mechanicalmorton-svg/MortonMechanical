-- Remove demo seed rows from an earlier schema run.
-- Run once in Supabase SQL Editor if fake inventory, staff, or fleet data is still present.

delete from staff
where id in ('st1', 'st2')
   or email in ('owner@mortonsmechanicals.com', 'alex@mortonsmechanicals.com');

delete from inventory
where id in ('inv1', 'inv2', 'inv3', 'inv4');

delete from fleet
where id in ('fl1', 'fl2');

-- After running this, open the portal User Management tab to sync real Supabase Auth users.
