begin;

delete from work_order_updates;
delete from payment_entries;
delete from work_orders;
delete from repairs;
delete from motorcycles;
delete from profiles;
delete from auth.users;

commit;
