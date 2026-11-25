create table if not exists outbox_events (
    id uuid primary key,
    routing_key varchar(120) not null,
    payload text not null,
    created_at timestamp with time zone not null,
    published boolean not null default false
);
create index if not exists outbox_events_pending_idx on outbox_events (published, created_at);
