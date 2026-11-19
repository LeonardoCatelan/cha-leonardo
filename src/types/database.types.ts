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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      gift_invitation_access_attempts: {
        Row: {
          attempt_count: number
          blocked_until: string | null
          fingerprint_hash: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          attempt_count?: number
          blocked_until?: string | null
          fingerprint_hash: string
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          attempt_count?: number
          blocked_until?: string | null
          fingerprint_hash?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      gift_invitation_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitation_id: string
          last_seen_at: string
          revoked_at: string | null
          session_version: number
          token_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          invitation_id: string
          last_seen_at?: string
          revoked_at?: string | null
          session_version: number
          token_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitation_id?: string
          last_seen_at?: string
          revoked_at?: string | null
          session_version?: number
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_invitation_sessions_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "gift_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_invitations: {
        Row: {
          audience: string
          code_ciphertext: string
          code_hash: string
          code_hint: string
          confirmed_at: string | null
          created_at: string
          display_name: string
          expires_at: string | null
          id: string
          is_active: boolean
          is_admin: boolean
          is_confirmed: boolean
          is_sent: boolean
          sent_at: string | null
          session_version: number
          updated_at: string
        }
        Insert: {
          audience: string
          code_ciphertext: string
          code_hash: string
          code_hint: string
          confirmed_at?: string | null
          created_at?: string
          display_name: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          is_confirmed?: boolean
          is_sent?: boolean
          sent_at?: string | null
          session_version?: number
          updated_at?: string
        }
        Update: {
          audience?: string
          code_ciphertext?: string
          code_hash?: string
          code_hint?: string
          confirmed_at?: string | null
          created_at?: string
          display_name?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          is_confirmed?: boolean
          is_sent?: boolean
          sent_at?: string | null
          session_version?: number
          updated_at?: string
        }
        Relationships: []
      }
      gift_reservations: {
        Row: {
          cancelled_at: string | null
          created_at: string
          gift_id: string
          id: string
          invitation_id: string
          purchased_at: string | null
          quantity: number
          status: Database["public"]["Enums"]["gift_reservation_status"]
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          gift_id: string
          id?: string
          invitation_id: string
          purchased_at?: string | null
          quantity: number
          status: Database["public"]["Enums"]["gift_reservation_status"]
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          gift_id?: string
          id?: string
          invitation_id?: string
          purchased_at?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["gift_reservation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_reservations_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_reservations_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "gift_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          quantity_available: number | null
          quantity_purchased: number
          quantity_reserved: number
          quantity_total: number
          reference_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          quantity_available?: number | null
          quantity_purchased?: number
          quantity_reserved?: number
          quantity_total?: number
          reference_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          quantity_available?: number | null
          quantity_purchased?: number
          quantity_reserved?: number
          quantity_total?: number
          reference_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_invitation_access_attempt: {
        Args: { p_fingerprint_hash: string }
        Returns: boolean
      }
      delete_gift_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      purge_expired_invitation_state: { Args: never; Returns: undefined }
      rotate_gift_invitation_code: {
        Args: {
          p_code_ciphertext: string
          p_code_hash: string
          p_code_hint: string
          p_invitation_id: string
        }
        Returns: number
      }
      set_gift_invitation_confirmed: {
        Args: { p_invitation_id: string; p_is_confirmed: boolean }
        Returns: boolean
      }
      set_gift_invitation_sent: {
        Args: { p_invitation_id: string; p_is_sent: boolean }
        Returns: boolean
      }
      set_gift_reservation_quantity: {
        Args: { p_gift_id: string; p_invitation_id: string; p_quantity: number }
        Returns: string
      }
      update_invitation_gift_reservation: {
        Args: { p_action: string; p_gift_id: string; p_invitation_id: string }
        Returns: Database["public"]["Enums"]["gift_reservation_status"]
      }
    }
    Enums: {
      gift_reservation_status: "reserved" | "purchased" | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      gift_reservation_status: ["reserved", "purchased", "cancelled"],
    },
  },
} as const
