create table if not exists blockchain_transactions (
    id uuid primary key,
    payment_id uuid not null unique,
    receiver_wallet_id uuid not null,
    amount numeric(24, 6) not null,
    currency varchar(10) not null,
    transaction_hash varchar(80) not null,
    status varchar(20) not null,
    created_at timestamp with time zone not null
);
