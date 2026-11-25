create table if not exists wallets (
    id uuid primary key,
    owner_name varchar(255) not null,
    currency varchar(10) not null,
    available_balance numeric(24, 6) not null,
    reserved_balance numeric(24, 6) not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint wallets_non_negative_balances check (available_balance >= 0 and reserved_balance >= 0)
);
