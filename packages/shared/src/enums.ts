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

export const VehicleType = {
  MOTO: "moto",
  BIKE: "bike",
  CAR: "car",
} as const;

export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

export const VehicleTypeLabel: Record<VehicleType, string> = {
  [VehicleType.MOTO]: "Moto",
  [VehicleType.BIKE]: "Bicicleta",
  [VehicleType.CAR]: "Carro",
};

export const VehicleTypeOptions = [
  { value: VehicleType.MOTO, label: VehicleTypeLabel[VehicleType.MOTO] },
  { value: VehicleType.BIKE, label: VehicleTypeLabel[VehicleType.BIKE] },
  { value: VehicleType.CAR, label: VehicleTypeLabel[VehicleType.CAR] },
] as const;
