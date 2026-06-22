/**
 * Tipos de domínio compartilhados entre web e mobile.
 * Nunca importar tipos do banco diretamente aqui — use apenas quando necessário nos apps.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DeliveryFeeRange {
  minKm: number;
  maxKm: number;
  fee: number;
}
