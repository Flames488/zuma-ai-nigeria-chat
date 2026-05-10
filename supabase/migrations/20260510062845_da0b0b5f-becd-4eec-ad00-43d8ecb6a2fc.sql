create table public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider text not null default 'twilio',
  business_id uuid references public.businesses(id) on delete cascade,
  from_number text,
  to_number text,
  inbound_message text,
  ai_response text,
  send_status text not null default 'pending',
  error text,
  raw jsonb
);

create index webhook_logs_business_created_idx on public.webhook_logs(business_id, created_at desc);
create index webhook_logs_created_idx on public.webhook_logs(created_at desc);

alter table public.webhook_logs enable row level security;

create policy "Owner can view own webhook logs"
on public.webhook_logs
for select
to authenticated
using (
  business_id is not null and exists (
    select 1 from public.businesses b
    where b.id = webhook_logs.business_id and b.owner_id = auth.uid()
  )
);
