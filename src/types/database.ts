// Generated from migrated PostgreSQL 17 by Supabase postgrest-typegen. Do not edit.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      assets: {
        Row: {
          allow_negative: boolean
          asset_type: string
          clan_id: string
          code: string
          created_at: string
          created_by: string
          decimal_places: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          required_quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          allow_negative?: boolean
          asset_type: string
          clan_id: string
          code: string
          created_at?: string
          created_by: string
          decimal_places?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          required_quantity?: number
          unit: string
          updated_at?: string
        }
        Update: {
          allow_negative?: boolean
          asset_type?: string
          clan_id?: string
          code?: string
          created_at?: string
          created_by?: string
          decimal_places?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          required_quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          clan_id: string
          created_at: string
          file_size: number
          id: string
          mime_type: string
          original_name: string
          storage_path: string
          transaction_id: string
          uploaded_by: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          file_size: number
          id?: string
          mime_type: string
          original_name: string
          storage_path: string
          transaction_id: string
          uploaded_by: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          file_size?: number
          id?: string
          mime_type?: string
          original_name?: string
          storage_path?: string
          transaction_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_clan_id_transaction_id_fkey"
            columns: ["clan_id", "transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["clan_id", "id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          clan_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          clan_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          clan_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_invites: {
        Row: {
          clan_id: string
          created_at: string
          created_by: string
          default_role_id: string
          expires_at: string | null
          id: string
          invite_code: string
          is_active: boolean
          max_uses: number | null
          used_count: number
        }
        Insert: {
          clan_id: string
          created_at?: string
          created_by: string
          default_role_id: string
          expires_at?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
        }
        Update: {
          clan_id?: string
          created_at?: string
          created_by?: string
          default_role_id?: string
          expires_at?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "clan_invites_clan_id_default_role_id_fkey"
            columns: ["clan_id", "default_role_id"]
            isOneToOne: false
            referencedRelation: "clan_roles"
            referencedColumns: ["clan_id", "id"]
          },
          {
            foreignKeyName: "clan_invites_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_members: {
        Row: {
          character_name: string
          clan_id: string
          created_at: string
          id: string
          joined_at: string | null
          role_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          character_name: string
          clan_id: string
          created_at?: string
          id?: string
          joined_at?: string | null
          role_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          character_name?: string
          clan_id?: string
          created_at?: string
          id?: string
          joined_at?: string | null
          role_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clan_members_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_members_clan_id_role_id_fkey"
            columns: ["clan_id", "role_id"]
            isOneToOne: false
            referencedRelation: "clan_roles"
            referencedColumns: ["clan_id", "id"]
          },
          {
            foreignKeyName: "clan_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_roles: {
        Row: {
          clan_id: string
          created_at: string
          id: string
          is_system_role: boolean
          name: string
          updated_at: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          id?: string
          is_system_role?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          id?: string
          is_system_role?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_roles_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clans: {
        Row: {
          created_at: string
          created_by: string
          delivery_tracking_started_on: string
          game_name: string | null
          id: string
          logo_url: string | null
          name: string
          server_name: string | null
          slug: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          delivery_tracking_started_on?: string
          game_name?: string | null
          id?: string
          logo_url?: string | null
          name: string
          server_name?: string | null
          slug: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          delivery_tracking_started_on?: string
          game_name?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          server_name?: string | null
          slug?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      member_deliveries: {
        Row: {
          asset_id: string
          clan_id: string
          created_at: string
          delivery_date: string
          id: string
          member_id: string
          quantity: number
          recorded_by: string
        }
        Insert: {
          asset_id: string
          clan_id: string
          created_at?: string
          delivery_date: string
          id?: string
          member_id: string
          quantity: number
          recorded_by: string
        }
        Update: {
          asset_id?: string
          clan_id?: string
          created_at?: string
          delivery_date?: string
          id?: string
          member_id?: string
          quantity?: number
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_deliveries_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_deliveries_clan_id_member_id_fkey"
            columns: ["clan_id", "member_id"]
            isOneToOne: false
            referencedRelation: "clan_members"
            referencedColumns: ["clan_id", "id"]
          },
          {
            foreignKeyName: "member_deliveries_clan_id_asset_id_fkey"
            columns: ["clan_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["clan_id", "id"]
          },
          {
            foreignKeyName: "member_deliveries_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string
        }
        Insert: {
          code: string
          description: string
        }
        Update: {
          code?: string
          description?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          clan_id: string
          permission_code: string
          role_id: string
        }
        Insert: {
          clan_id: string
          permission_code: string
          role_id: string
        }
        Update: {
          clan_id?: string
          permission_code?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_clan_id_role_id_fkey"
            columns: ["clan_id", "role_id"]
            isOneToOne: false
            referencedRelation: "clan_roles"
            referencedColumns: ["clan_id", "id"]
          },
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
        ]
      }
      transaction_items: {
        Row: {
          asset_id: string
          clan_id: string
          from_warehouse_id: string | null
          id: string
          note: string | null
          quantity: number
          to_warehouse_id: string | null
          transaction_id: string
          unit_value: number | null
        }
        Insert: {
          asset_id: string
          clan_id: string
          from_warehouse_id?: string | null
          id?: string
          note?: string | null
          quantity: number
          to_warehouse_id?: string | null
          transaction_id: string
          unit_value?: number | null
        }
        Update: {
          asset_id?: string
          clan_id?: string
          from_warehouse_id?: string | null
          id?: string
          note?: string | null
          quantity?: number
          to_warehouse_id?: string | null
          transaction_id?: string
          unit_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_clan_id_asset_id_fkey"
            columns: ["clan_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["clan_id", "id"]
          },
          {
            foreignKeyName: "transaction_items_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_clan_id_from_warehouse_id_fkey"
            columns: ["clan_id", "from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["clan_id", "id"]
          },
          {
            foreignKeyName: "transaction_items_clan_id_to_warehouse_id_fkey"
            columns: ["clan_id", "to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["clan_id", "id"]
          },
          {
            foreignKeyName: "transaction_items_clan_id_transaction_id_fkey"
            columns: ["clan_id", "transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["clan_id", "id"]
          },
        ]
      }
      transactions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          clan_id: string
          client_request_id: string
          contributor_member_id: string | null
          created_at: string
          created_by: string
          id: string
          note: string | null
          reversal_transaction_id: string | null
          status: string
          transaction_date: string
          transaction_no: string
          transaction_type: string
          updated_at: string
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          clan_id: string
          client_request_id: string
          contributor_member_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          note?: string | null
          reversal_transaction_id?: string | null
          status?: string
          transaction_date?: string
          transaction_no?: string
          transaction_type: string
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          clan_id?: string
          client_request_id?: string
          contributor_member_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          note?: string | null
          reversal_transaction_id?: string | null
          status?: string
          transaction_date?: string
          transaction_no?: string
          transaction_type?: string
          updated_at?: string
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_clan_id_contributor_member_id_fkey"
            columns: ["clan_id", "contributor_member_id"]
            isOneToOne: false
            referencedRelation: "clan_members"
            referencedColumns: ["clan_id", "id"]
          },
          {
            foreignKeyName: "transactions_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_clan_id_reversal_transaction_id_fkey"
            columns: ["clan_id", "reversal_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["clan_id", "id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          clan_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      warehouse_asset_balances: {
        Row: {
          asset_id: string | null
          balance: number | null
          clan_id: string | null
          warehouse_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_clan_id_asset_id_fkey"
            columns: ["clan_id", "asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["clan_id", "id"]
          },
          {
            foreignKeyName: "transaction_items_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_clan_member: {
        Args: { p_character_name: string; p_clan_id: string }
        Returns: string
      }
      archive_clan: { Args: { p_clan_id: string }; Returns: string }
      can_access_asset_image_object: {
        Args: { p_name: string; p_write?: boolean }
        Returns: boolean
      }
      can_access_evidence_object: {
        Args: { p_name: string; p_write?: boolean }
        Returns: boolean
      }
      can_edit_transaction: {
        Args: { p_clan_id: string; p_transaction_id: string }
        Returns: boolean
      }
      can_manage_transaction_evidence: {
        Args: { p_clan_id: string; p_transaction_id: string }
        Returns: boolean
      }
      can_write_transaction: {
        Args: { p_clan_id: string; p_type: string }
        Returns: boolean
      }
      consume_login_rate_limit: {
        Args: {
          p_block_seconds?: number
          p_key_hash: string
          p_limit?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      create_and_post_transaction: {
        Args: {
          p_clan_id: string
          p_client_request_id: string
          p_contributor_member_id?: string
          p_from_warehouse_id?: string
          p_items: Json
          p_note?: string
          p_to_warehouse_id?: string
          p_transaction_type: string
        }
        Returns: string
      }
      create_asset: {
        Args: {
          p_allow_negative?: boolean
          p_asset_type: string
          p_clan_id: string
          p_code: string
          p_decimal_places?: number
          p_image_url?: string
          p_name: string
          p_unit: string
        }
        Returns: string
      }
      create_asset_with_required_quantity: {
        Args: {
          p_allow_negative?: boolean
          p_asset_type: string
          p_clan_id: string
          p_code: string
          p_decimal_places?: number
          p_image_url?: string
          p_name: string
          p_required_quantity?: number
          p_unit: string
        }
        Returns: string
      }
      create_clan: {
        Args: {
          p_character_name: string
          p_name: string
          p_slug: string
          p_type: string
        }
        Returns: string
      }
      create_custom_role: {
        Args: {
          p_clan_id: string
          p_name: string
          p_permission_codes?: string[]
        }
        Returns: string
      }
      create_warehouse: {
        Args: { p_clan_id: string; p_description?: string; p_name: string }
        Returns: string
      }
      deactivate_asset: {
        Args: { p_asset_id: string; p_clan_id: string }
        Returns: string
      }
      deactivate_warehouse: {
        Args: { p_clan_id: string; p_warehouse_id: string }
        Returns: string
      }
      delete_custom_role: {
        Args: { p_clan_id: string; p_role_id: string }
        Returns: string
      }
      has_clan_permission: {
        Args: { p_clan_id: string; p_permission_code: string }
        Returns: boolean
      }
      is_clan_leader: { Args: { p_clan_id: string }; Returns: boolean }
      is_clan_member: { Args: { p_clan_id: string }; Returns: boolean }
      post_transaction: { Args: { p_transaction_id: string }; Returns: string }
      register_transaction_attachment: {
        Args: {
          p_clan_id: string
          p_file_size: number
          p_mime_type: string
          p_original_name: string
          p_storage_path: string
          p_transaction_id: string
        }
        Returns: string
      }
      record_member_deliveries: {
        Args: {
          p_clan_id: string
          p_delivery_date: string
          p_items: Json
          p_member_id: string
        }
        Returns: number
      }
      record_member_delivery: {
        Args: {
          p_asset_id: string
          p_clan_id: string
          p_delivery_date: string
          p_member_id: string
          p_quantity: number
        }
        Returns: string
      }
      delete_member_delivery: {
        Args: { p_clan_id: string; p_delivery_id: string }
        Returns: string
      }
      update_member_delivery: {
        Args: {
          p_asset_id: string
          p_clan_id: string
          p_delivery_date: string
          p_delivery_id: string
          p_quantity: number
        }
        Returns: string
      }
      remove_clan_member: {
        Args: { p_clan_id: string; p_member_id: string }
        Returns: string
      }
      reset_login_rate_limit: {
        Args: { p_key_hash: string }
        Returns: undefined
      }
      resolve_login_email: { Args: { p_username: string }; Returns: string }
      set_default_warehouse: {
        Args: { p_clan_id: string; p_warehouse_id: string }
        Returns: string
      }
      update_asset_details: {
        Args: {
          p_asset_id: string
          p_clan_id: string
          p_image_url?: string
          p_name: string
        }
        Returns: string
      }
      update_asset_details_with_required_quantity: {
        Args: {
          p_asset_id: string
          p_clan_id: string
          p_image_url?: string
          p_name: string
          p_required_quantity: number
        }
        Returns: string
      }
      update_clan_details: {
        Args: { p_clan_id: string; p_name: string; p_type: string }
        Returns: string
      }
      update_clan_member_name: {
        Args: {
          p_character_name: string
          p_clan_id: string
          p_member_id: string
        }
        Returns: string
      }
      update_clan_member_role: {
        Args: { p_clan_id: string; p_member_id: string; p_role_id: string }
        Returns: string
      }
      update_custom_role: {
        Args: {
          p_clan_id: string
          p_name: string
          p_permission_codes?: string[]
          p_role_id: string
        }
        Returns: string
      }
      update_warehouse_details: {
        Args: {
          p_clan_id: string
          p_description?: string
          p_name: string
          p_warehouse_id: string
        }
        Returns: string
      }
      void_transaction: {
        Args: { p_clan_id: string; p_transaction_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
