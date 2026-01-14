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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_partner_otp: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          mobile: string
          otp_code: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_used?: boolean
          mobile: string
          otp_code: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          mobile?: string
          otp_code?: string
        }
        Relationships: []
      }
      delivery_partners: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_online: boolean
          latitude: number | null
          longitude: number | null
          mobile: string
          name: string
          password_hash: string | null
          profile_photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_online?: boolean
          latitude?: number | null
          longitude?: number | null
          mobile: string
          name: string
          password_hash?: string | null
          profile_photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_online?: boolean
          latitude?: number | null
          longitude?: number | null
          mobile?: string
          name?: string
          password_hash?: string | null
          profile_photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          created_at: string
          franchise_price: number
          id: string
          is_active: boolean
          item_info: string | null
          item_name: string
          item_photo_url: string | null
          seller_id: string
          seller_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          franchise_price: number
          id?: string
          is_active?: boolean
          item_info?: string | null
          item_name: string
          item_photo_url?: string | null
          seller_id: string
          seller_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          franchise_price?: number
          id?: string
          is_active?: boolean
          item_info?: string | null
          item_name?: string
          item_photo_url?: string | null
          seller_id?: string
          seller_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_at: string | null
          assigned_delivery_partner_id: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string
          delivery_fee: number
          delivery_latitude: number | null
          delivery_longitude: number | null
          delivery_mobile: string | null
          delivery_pin: string | null
          going_for_delivery_at: string | null
          going_for_pickup_at: string | null
          gst_charges: number
          id: string
          instructions: string | null
          is_rated: boolean
          items: Json
          payment_method: string
          pickup_at: string | null
          pickup_pin: string | null
          pickup_status: string | null
          platform_fee: number
          refund_id: string | null
          seller_accepted_at: string | null
          seller_id: string
          seller_name: string
          seller_packed_at: string | null
          seller_status: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_delivery_partner_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address: string
          delivery_fee?: number
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_mobile?: string | null
          delivery_pin?: string | null
          going_for_delivery_at?: string | null
          going_for_pickup_at?: string | null
          gst_charges?: number
          id?: string
          instructions?: string | null
          is_rated?: boolean
          items: Json
          payment_method?: string
          pickup_at?: string | null
          pickup_pin?: string | null
          pickup_status?: string | null
          platform_fee?: number
          refund_id?: string | null
          seller_accepted_at?: string | null
          seller_id: string
          seller_name: string
          seller_packed_at?: string | null
          seller_status?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_delivery_partner_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string
          delivery_fee?: number
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivery_mobile?: string | null
          delivery_pin?: string | null
          going_for_delivery_at?: string | null
          going_for_pickup_at?: string | null
          gst_charges?: number
          id?: string
          instructions?: string | null
          is_rated?: boolean
          items?: Json
          payment_method?: string
          pickup_at?: string | null
          pickup_pin?: string | null
          pickup_status?: string | null
          platform_fee?: number
          refund_id?: string | null
          seller_accepted_at?: string | null
          seller_id?: string
          seller_name?: string
          seller_packed_at?: string | null
          seller_status?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_delivery_partner_id_fkey"
            columns: ["assigned_delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string
          id: string
          order_id: string
          rating: number
          review: string | null
          seller_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          rating: number
          review?: string | null
          seller_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          review?: string | null
          seller_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_daily_wallet_credits: {
        Row: {
          amount: number
          created_at: string
          credit_date: string
          id: string
          seller_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          credit_date: string
          id?: string
          seller_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credit_date?: string
          id?: string
          seller_id?: string
        }
        Relationships: []
      }
      seller_wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          receipt_url: string | null
          seller_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          receipt_url?: string | null
          seller_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          receipt_url?: string | null
          seller_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_wallet_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_wallets_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          account_number: string
          bank_name: string
          category: string
          created_at: string
          franchise_percentage: number | null
          id: string
          ifsc_code: string
          is_bank_verified: boolean
          is_online: boolean
          mobile: string
          owner_name: string
          password_hash: string
          profile_photo_url: string | null
          seller_id: string | null
          seller_latitude: number | null
          seller_longitude: number | null
          seller_name: string
          status: string
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          account_number: string
          bank_name: string
          category?: string
          created_at?: string
          franchise_percentage?: number | null
          id?: string
          ifsc_code: string
          is_bank_verified?: boolean
          is_online?: boolean
          mobile: string
          owner_name: string
          password_hash: string
          profile_photo_url?: string | null
          seller_id?: string | null
          seller_latitude?: number | null
          seller_longitude?: number | null
          seller_name: string
          status?: string
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string
          bank_name?: string
          category?: string
          created_at?: string
          franchise_percentage?: number | null
          id?: string
          ifsc_code?: string
          is_bank_verified?: boolean
          is_online?: boolean
          mobile?: string
          owner_name?: string
          password_hash?: string
          profile_photo_url?: string | null
          seller_id?: string | null
          seller_latitude?: number | null
          seller_longitude?: number | null
          seller_name?: string
          status?: string
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_modules: {
        Row: {
          badge: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_chats: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          user_mobile: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          user_mobile?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          user_mobile?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          chat_id: string
          created_at: string | null
          id: string
          message: string
          sender_type: string
        }
        Insert: {
          chat_id: string
          created_at?: string | null
          id?: string
          message: string
          sender_type: string
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          id?: string
          message?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "support_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          apartment_area: string | null
          area: string | null
          created_at: string
          directions: string | null
          full_address: string
          house_number: string
          id: string
          is_default: boolean
          label: string
          latitude: number
          longitude: number
          mobile: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apartment_area?: string | null
          area?: string | null
          created_at?: string
          directions?: string | null
          full_address: string
          house_number: string
          id?: string
          is_default?: boolean
          label?: string
          latitude: number
          longitude: number
          mobile?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apartment_area?: string | null
          area?: string | null
          created_at?: string
          directions?: string | null
          full_address?: string
          house_number?: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number
          longitude?: number
          mobile?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_otp: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          mobile: string
          otp_code: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_used?: boolean
          mobile: string
          otp_code: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          mobile?: string
          otp_code?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          is_active: boolean
          last_active_at: string
          session_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          is_active?: boolean
          last_active_at?: string
          session_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          is_active?: boolean
          last_active_at?: string
          session_token?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          order_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          order_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          order_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean
          mobile: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean
          mobile: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean
          mobile?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      zippy_pass_subscriptions: {
        Row: {
          amount: number
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          razorpay_payment_id: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          razorpay_payment_id: string
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          razorpay_payment_id?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_seller_daily_net_earnings: {
        Args: { p_date: string; p_seller_id: string }
        Returns: number
      }
      credit_daily_seller_wallets: {
        Args: { p_date?: string }
        Returns: undefined
      }
      generate_delivery_pin: { Args: never; Returns: string }
      generate_order_id: {
        Args: { seller_name_param: string }
        Returns: string
      }
      generate_seller_id: { Args: never; Returns: string }
      get_seller_rating: {
        Args: { seller_uuid: string }
        Returns: {
          average_rating: number
          total_ratings: number
        }[]
      }
      hash_password: { Args: { password: string }; Returns: string }
      verify_password: {
        Args: { hash: string; password: string }
        Returns: boolean
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
    Enums: {},
  },
} as const
