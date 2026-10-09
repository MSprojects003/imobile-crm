begin;

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (
    status = any (
      array[
        'pending'::text,
        'accepted'::text,
        'rejected'::text,
        'processing'::text,
        'packing'::text,
        'packed'::text,
        'delivered'::text
      ]
    )
  );

alter table public.order_items
  drop constraint if exists order_items_status_check;

alter table public.order_items
  add constraint order_items_status_check
  check (
    status = any (
      array[
        'pending'::text,
        'processing'::text,
        'packed'::text,
        'delivered'::text
      ]
    )
  );

alter table public.sub_order_items
  drop constraint if exists sub_order_items_status_check;

update public.sub_order_items
set status = case
  when status = 'packing' then 'packed'
  when status = 'no_items' then 'pending'
  else status
end
where status in ('packing', 'no_items');

alter table public.sub_order_items
  add constraint sub_order_items_status_check
  check (
    status = any (
      array[
        'pending'::text,
        'processing'::text,
        'packed'::text,
        'delivered'::text
      ]
    )
  );

create or replace function public.update_order_sub_item_status(
  p_order_id uuid,
  p_sub_order_item_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_order_item_id uuid;
  v_item_status text;
  v_order_status text;
  v_sub_item_count integer;
  v_item_count integer;
begin
  if p_status not in ('pending', 'processing', 'packed', 'delivered') then
    raise exception 'Invalid order fulfillment status.'
      using errcode = '22023';
  end if;

  perform id
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.'
      using errcode = 'P0002';
  end if;

  select sub_item.order_item_id
  into v_order_item_id
  from public.sub_order_items as sub_item
  inner join public.order_items as item on item.id = sub_item.order_item_id
  where sub_item.id = p_sub_order_item_id
    and item.order_id = p_order_id
  for update of sub_item, item;

  if not found then
    raise exception 'The selected sub-order item does not belong to this order.'
      using errcode = 'P0002';
  end if;

  update public.sub_order_items
  set status = p_status
  where id = p_sub_order_item_id;

  select
    count(*)::integer,
    case
      when bool_or(status = 'processing') then 'processing'
      when bool_and(status = 'delivered') then 'delivered'
      when bool_and(status in ('packed', 'delivered')) then 'packed'
      else 'pending'
    end
  into v_sub_item_count, v_item_status
  from public.sub_order_items
  where order_item_id = v_order_item_id;

  if v_sub_item_count = 0 then
    v_item_status := 'pending';
  end if;

  update public.order_items
  set status = v_item_status
  where id = v_order_item_id;

  select
    count(*)::integer,
    case
      when bool_or(status = 'processing') then 'processing'
      when bool_and(status = 'delivered') then 'delivered'
      when bool_and(status in ('packed', 'delivered')) then 'packed'
      else 'pending'
    end
  into v_item_count, v_order_status
  from public.order_items
  where order_id = p_order_id;

  if v_item_count = 0 then
    v_order_status := 'pending';
  end if;

  update public.orders
  set status = v_order_status
  where id = p_order_id;

  return jsonb_build_object(
    'orderId', p_order_id,
    'orderItemId', v_order_item_id,
    'subOrderItemStatus', p_status,
    'orderItemStatus', v_item_status,
    'orderStatus', v_order_status
  );
end;
$function$;

revoke all on function public.update_order_sub_item_status(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.update_order_sub_item_status(uuid, uuid, text)
  to service_role;

commit;
