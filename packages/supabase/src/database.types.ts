/**
 * database.types.ts — Gerado automaticamente por sync-db.ps1
 *
 * NÃO EDITE MANUALMENTE.
 * Execute .\sync-db.ps1 após qualquer `supabase db reset` para regenerar.
 *
 * Este arquivo é a fonte de verdade TypeScript do schema do banco.
 * Qualquer alteração no banco que não seja refletida aqui é um bug esperando acontecer.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
