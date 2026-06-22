-- Migration: Criação dos enums de domínio
-- Ordem: primeiro (sem dependências)

CREATE TYPE user_role AS ENUM ('admin', 'business_owner', 'courier');

CREATE TYPE order_status AS ENUM (
  'draft',
  'pending_courier',
  'accepted',
  'collected',
  'in_transit',
  'delivered',
  'rejected'
);

CREATE TYPE courier_status AS ENUM ('offline', 'available', 'busy');

CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
