create table if not exists notifications (
    id uuid primary key,
    payment_id uuid not null,
    status varchar(32) not null,
    message varchar(255) not null,
    created_at timestamp with time zone not null,
    constraint notifications_payment_status_unique unique (payment_id, status)
);
