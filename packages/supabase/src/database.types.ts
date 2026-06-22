/**
 * database.types.ts — Gerado automaticamente por sync-db.ps1
 *
 * ⚠️ MODO MANUAL: Tipos inseridos baseados no SCHEMA.md do GoDelivery.
 * Execute .\sync-db.ps1 assim que o banco local estiver disponível para regenerar.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "business_owner" | "courier";
export type OrderStatus =
  | "draft"
  | "pending_courier"
  | "accepted"
  | "collected"
  | "in_transit"
  | "delivered"
  | "rejected";
export type CourierStatus = "offline" | "available" | "busy";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface PlatformSettingsRow {
  id: string;
  min_tax_fee: number;
  platform_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  stripe_customer_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantSettingsRow {
  id: string;
  tenant_id: string;
  fee_ranges: Json;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  tenant_id: string | null;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourierRow {
  id: string;
  tenant_id: string;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  license_number: string | null;
  status: CourierStatus;
  fcm_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  tenant_id: string;
  courier_id: string | null;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  order_value: number;
  delivery_fee: number;
  platform_fee: number;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistoryRow {
  id: string;
  order_id: string;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
}

export interface CourierLocationRow {
  id: string;
  courier_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
}

export interface PaymentRow {
  id: string;
  tenant_id: string;
  order_id: string;
  stripe_payment_intent_id: string | null;
  amount: number;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  data: Json | null;
  is_read: boolean;
  created_at: string;
}

export interface PlatformSettingsInsert {
  id?: string;
  min_tax_fee?: number;
  platform_percentage?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TenantInsert {
  id?: string;
  name: string;
  slug: string;
  document?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  stripe_customer_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TenantSettingsInsert {
  id?: string;
  tenant_id: string;
  fee_ranges?: Json;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileInsert {
  id: string;
  tenant_id?: string | null;
  role?: UserRole;
  full_name?: string | null;
  phone?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CourierInsert {
  id: string;
  tenant_id: string;
  vehicle_type?: string | null;
  vehicle_plate?: string | null;
  license_number?: string | null;
  status?: CourierStatus;
  fcm_token?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrderInsert {
  id?: string;
  tenant_id: string;
  courier_id?: string | null;
  status?: OrderStatus;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  delivery_address: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  order_value?: number;
  delivery_fee?: number;
  platform_fee?: number;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrderStatusHistoryInsert {
  id?: string;
  order_id: string;
  status: OrderStatus;
  notes?: string | null;
  created_at?: string;
}

export interface CourierLocationInsert {
  id?: string;
  courier_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  recorded_at?: string;
}

export interface PaymentInsert {
  id?: string;
  tenant_id: string;
  order_id: string;
  stripe_payment_intent_id?: string | null;
  amount: number;
  status?: PaymentStatus;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationInsert {
  id?: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  data?: Json | null;
  is_read?: boolean;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      platform_settings: {
        Row: PlatformSettingsRow;
        Insert: PlatformSettingsInsert;
        Update: Partial<PlatformSettingsRow>;
        Relationships: never[];
      };
      tenants: {
        Row: TenantRow;
        Insert: TenantInsert;
        Update: Partial<TenantRow>;
        Relationships: never[];
      };
      tenant_settings: {
        Row: TenantSettingsRow;
        Insert: TenantSettingsInsert;
        Update: Partial<TenantSettingsRow>;
        Relationships: never[];
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileRow>;
        Relationships: never[];
      };
      couriers: {
        Row: CourierRow;
        Insert: CourierInsert;
        Update: Partial<CourierRow>;
        Relationships: never[];
      };
      orders: {
        Row: OrderRow;
        Insert: OrderInsert;
        Update: Partial<OrderRow>;
        Relationships: never[];
      };
      order_status_history: {
        Row: OrderStatusHistoryRow;
        Insert: OrderStatusHistoryInsert;
        Update: Partial<OrderStatusHistoryRow>;
        Relationships: never[];
      };
      courier_locations: {
        Row: CourierLocationRow;
        Insert: CourierLocationInsert;
        Update: Partial<CourierLocationRow>;
        Relationships: never[];
      };
      payments: {
        Row: PaymentRow;
        Insert: PaymentInsert;
        Update: Partial<PaymentRow>;
        Relationships: never[];
      };
      notifications: {
        Row: NotificationRow;
        Insert: NotificationInsert;
        Update: Partial<NotificationRow>;
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
      courier_status: CourierStatus;
      payment_status: PaymentStatus;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
