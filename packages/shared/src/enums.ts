/**
 * Enums de domínio compartilhados entre web e mobile.
 * Usar const objects em vez de TypeScript enum (tree-shake friendly).
 */

export const UserRole = {
  ADMIN: "admin",
  BUSINESS_OWNER: "business_owner",
  COURIER: "courier",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OrderStatus = {
  DRAFT: "draft",
  PENDING_COURIER: "pending_courier",
  ACCEPTED: "accepted",
  COLLECTED: "collected",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
  REJECTED: "rejected",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const CourierStatus = {
  OFFLINE: "offline",
  AVAILABLE: "available",
  BUSY: "busy",
} as const;

export type CourierStatus = (typeof CourierStatus)[keyof typeof CourierStatus];

export const PaymentStatus = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
