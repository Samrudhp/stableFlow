create table if not exists payments (
    id uuid primary key,
    sender_wallet_id uuid not null,
    receiver_wallet_id uuid not null,
    amount numeric(24, 6) not null check (amount > 0),
    currency varchar(10) not null,
    status varchar(32) not null,
    idempotency_key varchar(200) not null unique,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);
