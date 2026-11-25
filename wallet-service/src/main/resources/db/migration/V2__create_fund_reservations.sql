create table if not exists fund_reservations (
    id uuid primary key,
    payment_id uuid not null unique,
    sender_wallet_id uuid not null,
    receiver_wallet_id uuid not null,
    amount numeric(24, 6) not null check (amount > 0),
    status varchar(20) not null,
    created_at timestamp with time zone not null
);
