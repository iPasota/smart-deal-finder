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
      affiliate_clicks: {
        Row: {
          country: string | null
          created_at: string
          deal_id: string
          id: string
          position: string
          referrer_host: string | null
          shop: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          deal_id: string
          id?: string
          position?: string
          referrer_host?: string | null
          shop: string
        }
        Update: {
          country?: string | null
          created_at?: string
          deal_id?: string
          id?: string
          position?: string
          referrer_host?: string | null
          shop?: string
        }
        Relationships: []
      }
      affiliate_tags: {
        Row: {
          country_code: string
          created_at: string
          deeplink_pattern: string
          id: string
          shop_id: string
          tag: string
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          deeplink_pattern: string
          id?: string
          shop_id: string
          tag: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          deeplink_pattern?: string
          id?: string
          shop_id?: string
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_tags_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          intro_md: string | null
          keepa_category_id: number | null
          name: string
          outro_md: string | null
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intro_md?: string | null
          keepa_category_id?: number | null
          name: string
          outro_md?: string | null
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intro_md?: string | null
          keepa_category_id?: number | null
          name?: string
          outro_md?: string | null
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      keepa_sync_log: {
        Row: {
          deals_fetched: number | null
          duration_ms: number | null
          errors: Json | null
          finished_at: string | null
          id: string
          offers_upserted: number | null
          price_history_rows: number | null
          products_inserted: number | null
          refill_rate: number | null
          started_at: string
          status: string
          sync_type: string
          tokens_consumed: number | null
          tokens_left: number | null
          triggered_by: string
        }
        Insert: {
          deals_fetched?: number | null
          duration_ms?: number | null
          errors?: Json | null
          finished_at?: string | null
          id?: string
          offers_upserted?: number | null
          price_history_rows?: number | null
          products_inserted?: number | null
          refill_rate?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          tokens_consumed?: number | null
          tokens_left?: number | null
          triggered_by?: string
        }
        Update: {
          deals_fetched?: number | null
          duration_ms?: number | null
          errors?: Json | null
          finished_at?: string | null
          id?: string
          offers_upserted?: number | null
          price_history_rows?: number | null
          products_inserted?: number | null
          refill_rate?: number | null
          started_at?: string
          status?: string
          sync_type?: string
          tokens_consumed?: number | null
          tokens_left?: number | null
          triggered_by?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          affiliate_tag_override: string | null
          avg_price_30d_cents: number | null
          avg_price_90d_cents: number | null
          condition: string
          country_code: string
          created_at: string
          currency: string
          deeplink_template: string | null
          discount_percent: number | null
          external_id: string
          first_seen_at: string
          id: string
          in_stock: boolean
          keepa_domain_id: number | null
          last_seen_at: string
          list_price_cents: number | null
          price_cents: number
          product_id: string
          ships_to: string[]
          shop_id: string
          updated_at: string
        }
        Insert: {
          affiliate_tag_override?: string | null
          avg_price_30d_cents?: number | null
          avg_price_90d_cents?: number | null
          condition: string
          country_code: string
          created_at?: string
          currency?: string
          deeplink_template?: string | null
          discount_percent?: number | null
          external_id: string
          first_seen_at?: string
          id?: string
          in_stock?: boolean
          keepa_domain_id?: number | null
          last_seen_at?: string
          list_price_cents?: number | null
          price_cents: number
          product_id: string
          ships_to?: string[]
          shop_id: string
          updated_at?: string
        }
        Update: {
          affiliate_tag_override?: string | null
          avg_price_30d_cents?: number | null
          avg_price_90d_cents?: number | null
          condition?: string
          country_code?: string
          created_at?: string
          currency?: string
          deeplink_template?: string | null
          discount_percent?: number | null
          external_id?: string
          first_seen_at?: string
          id?: string
          in_stock?: boolean
          keepa_domain_id?: number | null
          last_seen_at?: string
          list_price_cents?: number | null
          price_cents?: number
          product_id?: string
          ships_to?: string[]
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          id: number
          observed_at: string
          offer_id: string
          price_cents: number
        }
        Insert: {
          id?: number
          observed_at?: string
          offer_id: string
          price_cents: number
        }
        Update: {
          id?: number
          observed_at?: string
          offer_id?: string
          price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          asin: string | null
          brand: string | null
          category: string | null
          category_id: string | null
          created_at: string
          gtin: string | null
          id: string
          image_url: string | null
          keepa_category_id: number | null
          keepa_last_refreshed_at: string | null
          mpn: string | null
          sales_rank: number | null
          title: string
          updated_at: string
        }
        Insert: {
          asin?: string | null
          brand?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          gtin?: string | null
          id?: string
          image_url?: string | null
          keepa_category_id?: number | null
          keepa_last_refreshed_at?: string | null
          mpn?: string | null
          sales_rank?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          asin?: string | null
          brand?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          gtin?: string | null
          id?: string
          image_url?: string | null
          keepa_category_id?: number | null
          keepa_last_refreshed_at?: string | null
          mpn?: string | null
          sales_rank?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shops: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          display_name: string
          id: string
          link_rel: string
          logo_url: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          display_name: string
          id?: string
          link_rel?: string
          logo_url?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          display_name?: string
          id?: string
          link_rel?: string
          logo_url?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watches: {
        Row: {
          active: boolean
          asin: string
          condition: string
          created_at: string
          current_price_cents: number | null
          id: string
          last_triggered_at: string | null
          product_brand: string | null
          product_image_url: string | null
          product_title: string
          target_price_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          asin: string
          condition?: string
          created_at?: string
          current_price_cents?: number | null
          id?: string
          last_triggered_at?: string | null
          product_brand?: string | null
          product_image_url?: string | null
          product_title: string
          target_price_cents: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          asin?: string
          condition?: string
          created_at?: string
          current_price_cents?: number | null
          id?: string
          last_triggered_at?: string | null
          product_brand?: string | null
          product_image_url?: string | null
          product_title?: string
          target_price_cents?: number
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
