create table if not exists processed_events (
    event_id uuid primary key,
    processed_at timestamp with time zone not null
);
