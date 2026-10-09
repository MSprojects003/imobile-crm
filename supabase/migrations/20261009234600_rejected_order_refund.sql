begin;

create or replace function public.update_order_status(
  p_order_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_order public.orders%rowtype;
begin
  if p_status not in (
    'pending',
    'accepted',
    'processing',
    'packing',
    'packed',
    'delivered',
    'rejected'
  ) then
    raise exception 'Invalid order status.'
      using errcode = '22023';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.'
      using errcode = 'P0002';
  end if;

  if p_status = 'rejected' and v_order.status <> 'rejected' then
    update public.orders
    set status = p_status,
        refund_amount = refund_amount + full_total,
        full_total = 0
    where id = p_order_id
    returning * into v_order;
  else
    update public.orders
    set status = p_status
    where id = p_order_id
    returning * into v_order;
  end if;

  return jsonb_build_object(
    'id', v_order.id,
    'status', v_order.status,
    'estimatedTotal', v_order.estimated_total,
    'fullTotal', v_order.full_total,
    'refundAmount', v_order.refund_amount
  );
end;
$function$;

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
  v_current_order_status text;
  v_previous_status text;
  v_sub_item_subtotal numeric(12, 2);
  v_item_status text;
  v_order_status text;
  v_item_status_count integer;
  v_refund_amount numeric(12, 2);
  v_full_total numeric(12, 2);
begin
  if p_status not in ('packing', 'packed', 'delivered', 'no_items') then
    raise exception 'Invalid order fulfillment status.'
      using errcode = '22023';
  end if;

  select status
  into v_current_order_status
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.'
      using errcode = 'P0002';
  end if;

  select sub_item.order_item_id, sub_item.status, sub_item.subtotal
  into v_order_item_id, v_previous_status, v_sub_item_subtotal
  from public.sub_order_items as sub_item
  inner join public.order_items as item on item.id = sub_item.order_item_id
  where sub_item.id = p_sub_order_item_id
    and item.order_id = p_order_id
  for update of sub_item, item;

  if not found then
    raise exception 'The selected sub-order item does not belong to this order.'
      using errcode = 'P0002';
  end if;

  if v_previous_status <> 'no_items' and p_status = 'no_items' then
    update public.orders
    set full_total = full_total - v_sub_item_subtotal
    where id = p_order_id
      and full_total >= v_sub_item_subtotal;

    if not found then
      raise exception 'The order total is less than the amount being refunded.'
        using errcode = '22003';
    end if;
  elsif v_previous_status = 'no_items' and p_status <> 'no_items' then
    update public.orders
    set full_total = full_total + v_sub_item_subtotal
    where id = p_order_id;
  end if;

  update public.sub_order_items
  set status = p_status
  where id = p_sub_order_item_id;

  select status, count(*)::integer
  into v_item_status, v_item_status_count
  from public.sub_order_items
  where order_item_id = v_order_item_id
    and status <> 'no_items'
  group by status
  order by
    count(*) desc,
    case status
      when 'packing' then 1
      when 'processing' then 2
      when 'packed' then 3
      when 'delivered' then 4
      else 5
    end
  limit 1;

  if v_item_status_count is null then
    v_item_status := 'processing';
  end if;

  update public.order_items
  set status = v_item_status
  where id = v_order_item_id;

  if v_current_order_status = 'rejected' then
    v_order_status := 'rejected';
  elsif exists (
    select 1
    from public.order_items as item
    inner join public.sub_order_items as sub_item
      on sub_item.order_item_id = item.id
    where item.order_id = p_order_id
      and sub_item.status = 'processing'
  ) then
    v_order_status := 'processing';
  elsif exists (
    select 1
    from public.order_items
    where order_id = p_order_id
      and status = 'packing'
  ) then
    v_order_status := 'packing';
  else
    v_order_status := 'processing';
  end if;

  select coalesce(
    sum(sub_item.subtotal) filter (where sub_item.status = 'no_items'),
    0
  )::numeric(12, 2)
  into v_refund_amount
  from public.order_items as item
  inner join public.sub_order_items as sub_item
    on sub_item.order_item_id = item.id
  where item.order_id = p_order_id;

  update public.orders
  set status = v_order_status,
      refund_amount = case
        when v_current_order_status = 'rejected' then refund_amount
        else v_refund_amount
      end
  where id = p_order_id
  returning full_total, refund_amount
  into v_full_total, v_refund_amount;

  return jsonb_build_object(
    'orderId', p_order_id,
    'orderItemId', v_order_item_id,
    'subOrderItemStatus', p_status,
    'orderItemStatus', v_item_status,
    'orderStatus', v_order_status,
    'refundAmount', v_refund_amount,
    'fullTotal', v_full_total
  );
end;
$function$;

revoke all on function public.update_order_status(uuid, text)
  from public, anon, authenticated;
grant execute on function public.update_order_status(uuid, text)
  to service_role;

revoke all on function public.update_order_sub_item_status(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.update_order_sub_item_status(uuid, uuid, text)
  to service_role;

commit;
