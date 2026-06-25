export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      courier_locations: {
        Row: {
          accuracy: number | null
          courier_id: string
          id: string
          latitude: number
          longitude: number
          recorded_at: string
        }
        Insert: {
          accuracy?: number | null
          courier_id: string
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
        }
        Update: {
          accuracy?: number | null
          courier_id?: string
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_locations_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      couriers: {
        Row: {
          created_at: string
          current_location_lat: number | null
          current_location_lng: number | null
          fcm_token: string | null
          id: string
          last_location_at: string | null
          license_number: string | null
          rating: number | null
          status: Database["public"]["Enums"]["courier_status"]
          tenant_id: string
          total_deliveries: number
          total_earnings: number
          updated_at: string
          vehicle_plate: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          current_location_lat?: number | null
          current_location_lng?: number | null
          fcm_token?: string | null
          id: string
          last_location_at?: string | null
          license_number?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["courier_status"]
          tenant_id: string
          total_deliveries?: number
          total_earnings?: number
          updated_at?: string
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          current_location_lat?: number | null
          current_location_lng?: number | null
          fcm_token?: string | null
          id?: string
          last_location_at?: string | null
          license_number?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["courier_status"]
          tenant_id?: string
          total_deliveries?: number
          total_earnings?: number
          updated_at?: string
          vehicle_plate?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "couriers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couriers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_routes: {
        Row: {
          courier_id: string
          created_at: string
          ended_at: string | null
          estimated_duration_min: number | null
          id: string
          started_at: string | null
          status: string
          tenant_id: string
          total_distance_km: number | null
          updated_at: string
        }
        Insert: {
          courier_id: string
          created_at?: string
          ended_at?: string | null
          estimated_duration_min?: number | null
          id?: string
          started_at?: string | null
          status?: string
          tenant_id: string
          total_distance_km?: number | null
          updated_at?: string
        }
        Update: {
          courier_id?: string
          created_at?: string
          ended_at?: string | null
          estimated_duration_min?: number | null
          id?: string
          started_at?: string | null
          status?: string
          tenant_id?: string
          total_distance_km?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_routes_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_routes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          is_read: boolean
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          actor_role: string
          courier_id: string | null
          created_at: string
          event_type: Database["public"]["Enums"]["order_event_type"]
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json | null
          notes: string | null
          order_id: string
          route_id: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string
          courier_id?: string | null
          created_at?: string
          event_type: Database["public"]["Enums"]["order_event_type"]
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          notes?: string | null
          order_id: string
          route_id?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          courier_id?: string | null
          created_at?: string
          event_type?: Database["public"]["Enums"]["order_event_type"]
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json | null
          notes?: string | null
          order_id?: string
          route_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          assigned_at: string | null
          cancelled_at: string | null
          collected_at: string | null
          courier_id: string | null
          courier_notified_at: string | null
          created_at: string
          created_by: string
          customer_name: string
          customer_phone: string
          deleted_at: string | null
          delivered_at: string | null
          delivery_address: string
          delivery_fee: number
          delivery_lat: number | null
          delivery_lng: number | null
          distance_km: number | null
          estimated_minutes: number | null
          id: string
          in_transit_at: string | null
          operated_by: string | null
          order_value: number
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          platform_fee: number
          proof_image_url: string | null
          proof_uploaded_at: string | null
          rejected_at: string | null
          rejection_reason: string | null
          route_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string | null
          cancelled_at?: string | null
          collected_at?: string | null
          courier_id?: string | null
          courier_notified_at?: string | null
          created_at?: string
          created_by: string
          customer_name: string
          customer_phone: string
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_address: string
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          distance_km?: number | null
          estimated_minutes?: number | null
          id?: string
          in_transit_at?: string | null
          operated_by?: string | null
          order_value?: number
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          platform_fee?: number
          proof_image_url?: string | null
          proof_uploaded_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          route_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string | null
          cancelled_at?: string | null
          collected_at?: string | null
          courier_id?: string | null
          courier_notified_at?: string | null
          created_at?: string
          created_by?: string
          customer_name?: string
          customer_phone?: string
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_address?: string
          delivery_fee?: number
          delivery_lat?: number | null
          delivery_lng?: number | null
          distance_km?: number | null
          estimated_minutes?: number | null
          id?: string
          in_transit_at?: string | null
          operated_by?: string | null
          order_value?: number
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          platform_fee?: number
          proof_image_url?: string | null
          proof_uploaded_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          route_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "delivery_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          paid_at: string | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          maintenance_mode: boolean
          min_tax_fee: number
          platform_percentage: number
          support_email: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          maintenance_mode?: boolean
          min_tax_fee?: number
          platform_percentage?: number
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          maintenance_mode?: boolean
          min_tax_fee?: number
          platform_percentage?: number
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email_verified_at: string | null
          full_name: string
          id: string
          is_active: boolean
          last_sign_in_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email_verified_at?: string | null
          full_name: string
          id: string
          is_active?: boolean
          last_sign_in_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email_verified_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_sign_in_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string
          fee_ranges: Json
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_ranges?: Json
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_ranges?: Json
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          document: string | null
          email: string
          id: string
          is_active: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          phone: string | null
          plan: Database["public"]["Enums"]["plan"]
          primary_color: string | null
          slug: string
          stripe_customer_id: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          document?: string | null
          email: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan"]
          primary_color?: string | null
          slug: string
          stripe_customer_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          document?: string | null
          email?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan"]
          primary_color?: string | null
          slug?: string
          stripe_customer_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_tenant_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      courier_status: "offline" | "available" | "busy"
      order_event_type:
        | "created"
        | "assigned"
        | "reassigned"
        | "accepted"
        | "rejected"
        | "cancelled"
        | "collected"
        | "in_transit"
        | "delivered"
        | "courier_notified"
        | "route_started"
        | "route_ended"
        | "location_updated"
      order_status:
        | "draft"
        | "pending_courier"
        | "accepted"
        | "collected"
        | "in_transit"
        | "delivered"
        | "rejected"
        | "cancelled"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      plan: "free" | "basic" | "pro" | "enterprise"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
      user_role: "admin" | "business_owner" | "courier"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      courier_status: ["offline", "available", "busy"],
      order_event_type: [
        "created",
        "assigned",
        "reassigned",
        "accepted",
        "rejected",
        "cancelled",
        "collected",
        "in_transit",
        "delivered",
        "courier_notified",
        "route_started",
        "route_ended",
        "location_updated",
      ],
      order_status: [
        "draft",
        "pending_courier",
        "accepted",
        "collected",
        "in_transit",
        "delivered",
        "rejected",
        "cancelled",
      ],
      payment_status: ["pending", "paid", "failed", "refunded"],
      plan: ["free", "basic", "pro", "enterprise"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
      ],
      user_role: ["admin", "business_owner", "courier"],
    },
  },
} as const