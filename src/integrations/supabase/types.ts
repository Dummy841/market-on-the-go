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
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expiry_date: string
          id: string
          is_active: boolean
          max_discount_limit: number | null
          target_type: string
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expiry_date: string
          id?: string
          is_active?: boolean
          max_discount_limit?: number | null
          target_type?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expiry_date?: string
          id?: string
          is_active?: boolean
          max_discount_limit?: number | null
          target_type?: string
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          date_joined: string
          email: string | null
          id: string
          mobile: string
          name: string
          password: string
          pincode: string | null
          profile_photo: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_joined?: string
          email?: string | null
          id?: string
          mobile: string
          name: string
          password: string
          pincode?: string | null
          profile_photo?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_joined?: string
          email?: string | null
          id?: string
          mobile?: string
          name?: string
          password?: string
          pincode?: string | null
          profile_photo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string
          date_joined: string
          district: string | null
          email: string
          id: string
          ifsc_code: string | null
          name: string
          password: string
          phone: string | null
          profile_photo: string | null
          role: string
          state: string | null
          updated_at: string
          village: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          date_joined?: string
          district?: string | null
          email: string
          id?: string
          ifsc_code?: string | null
          name: string
          password: string
          phone?: string | null
          profile_photo?: string | null
          role?: string
          state?: string | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          date_joined?: string
          district?: string | null
          email?: string
          id?: string
          ifsc_code?: string | null
          name?: string
          password?: string
          phone?: string | null
          profile_photo?: string | null
          role?: string
          state?: string | null
          updated_at?: string
          village?: string | null
        }
        Relationships: []
      }
      farmers: {
        Row: {
          account_number: string | null
          address: string | null
          bank_name: string | null
          created_at: string
          date_joined: string
          district: string | null
          email: string
          id: string
          ifsc_code: string | null
          name: string
          password: string
          phone: string
          profile_photo: string | null
          state: string | null
          updated_at: string
          village: string | null
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          created_at?: string
          date_joined?: string
          district?: string | null
          email: string
          id?: string
          ifsc_code?: string | null
          name: string
          password: string
          phone: string
          profile_photo?: string | null
          state?: string | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          created_at?: string
          date_joined?: string
          district?: string | null
          email?: string
          id?: string
          ifsc_code?: string | null
          name?: string
          password?: string
          phone?: string
          profile_photo?: string | null
          state?: string | null
          updated_at?: string
          village?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category: string
          created_at: string
          farmer_id: string | null
          id: string
          name: string
          price_per_unit: number
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category: string
          created_at?: string
          farmer_id?: string | null
          id?: string
          name: string
          price_per_unit: number
          quantity?: number
          unit: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string
          created_at?: string
          farmer_id?: string | null
          id?: string
          name?: string
          price_per_unit?: number
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assigned_to: string | null
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          resolution: string | null
          status: string
          updated_at: string
          user_contact: string
          user_id: string
          user_name: string
          user_type: string
        }
        Insert: {
          assigned_to?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          resolution?: string | null
          status?: string
          updated_at?: string
          user_contact: string
          user_id: string
          user_name: string
          user_type: string
        }
        Update: {
          assigned_to?: string | null
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          resolution?: string | null
          status?: string
          updated_at?: string
          user_contact?: string
          user_id?: string
          user_name?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          coupon_used: string | null
          created_at: string
          customer_id: string | null
          customer_mobile: string
          customer_name: string
          discount: number
          id: string
          items: Json
          payment_method: string
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          coupon_used?: string | null
          created_at?: string
          customer_id?: string | null
          customer_mobile: string
          customer_name: string
          discount?: number
          id?: string
          items: Json
          payment_method: string
          status?: string
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          coupon_used?: string | null
          created_at?: string
          customer_id?: string | null
          customer_mobile?: string
          customer_name?: string
          discount?: number
          id?: string
          items?: Json
          payment_method?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
