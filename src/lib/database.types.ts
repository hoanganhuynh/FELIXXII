export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      body_rule_meta: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"]
          ease_note: string
          guidance: string
          label: string
        }
        Insert: {
          body_type: Database["public"]["Enums"]["body_type"]
          ease_note: string
          guidance: string
          label: string
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"]
          ease_note?: string
          guidance?: string
          label?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          label: string
          sku_prefix: string
          sort: number
        }
        Insert: {
          id: string
          label: string
          sku_prefix: string
          sort?: number
        }
        Update: {
          id?: string
          label?: string
          sku_prefix?: string
          sort?: number
        }
        Relationships: []
      }
      collections: {
        Row: {
          id: string
          image: string | null
          label: string
          note: string | null
          season: string
          sort: number
        }
        Insert: {
          id: string
          image?: string | null
          label: string
          note?: string | null
          season: string
          sort?: number
        }
        Update: {
          id?: string
          image?: string | null
          label?: string
          note?: string | null
          season?: string
          sort?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"] | null
          bust: number | null
          city: string | null
          email: string
          height: number | null
          hip: number | null
          id: string
          joined: string
          ltv: number
          name: string
          orders_count: number
          phone: string | null
          segment: Database["public"]["Enums"]["segment"]
          user_id: string | null
          waist: number | null
          weight: number | null
        }
        Insert: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          bust?: number | null
          city?: string | null
          email: string
          height?: number | null
          hip?: number | null
          id?: string
          joined?: string
          ltv?: number
          name: string
          orders_count?: number
          phone?: string | null
          segment?: Database["public"]["Enums"]["segment"]
          user_id?: string | null
          waist?: number | null
          weight?: number | null
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          bust?: number | null
          city?: string | null
          email?: string
          height?: number | null
          hip?: number | null
          id?: string
          joined?: string
          ltv?: number
          name?: string
          orders_count?: number
          phone?: string | null
          segment?: Database["public"]["Enums"]["segment"]
          user_id?: string | null
          waist?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string
          id: number
          name: string
          order_id: string
          price: number
          qty: number
          size: string
          sku: string
        }
        Insert: {
          color: string
          id?: never
          name: string
          order_id: string
          price: number
          qty: number
          size: string
          sku: string
        }
        Update: {
          color?: string
          id?: never
          name?: string
          order_id?: string
          price?: number
          qty?: number
          size?: string
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_sku_fkey"
            columns: ["sku"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["sku"]
          },
        ]
      }
      orders: {
        Row: {
          channel: Database["public"]["Enums"]["order_channel"]
          city: string | null
          customer_id: string
          id: string
          placed_at: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
        }
        Insert: {
          channel?: Database["public"]["Enums"]["order_channel"]
          city?: string | null
          customer_id: string
          id: string
          placed_at?: string
          status?: Database["public"]["Enums"]["order_status"]
          total: number
        }
        Update: {
          channel?: Database["public"]["Enums"]["order_channel"]
          city?: string | null
          customer_id?: string
          id?: string
          placed_at?: string
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      size_rules: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"]
          bust_max: number
          bust_min: number
          hip_max: number
          hip_min: number
          size: string
          waist_max: number
          waist_min: number
        }
        Insert: {
          body_type: Database["public"]["Enums"]["body_type"]
          bust_max: number
          bust_min: number
          hip_max: number
          hip_min: number
          size: string
          waist_max: number
          waist_min: number
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"]
          bust_max?: number
          bust_min?: number
          hip_max?: number
          hip_min?: number
          size?: string
          waist_max?: number
          waist_min?: number
        }
        Relationships: []
      }
      styles: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"] | null
          category_id: string
          collection_id: string
          created_at: string
          id: string
          images: string[]
          material: string | null
          name: string
          occasion: string | null
          price: number
          returns: number
          revenue: number | null
          search_vector: unknown
          serial: number
          silhouette: string | null
          status: Database["public"]["Enums"]["style_status"]
          style_code: string
          units_sold: number
          updated_at: string
          views: number
        }
        Insert: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          category_id: string
          collection_id: string
          created_at?: string
          id?: string
          images?: string[]
          material?: string | null
          name: string
          occasion?: string | null
          price: number
          returns?: number
          revenue?: number | null
          search_vector?: unknown
          serial: number
          silhouette?: string | null
          status?: Database["public"]["Enums"]["style_status"]
          style_code: string
          units_sold?: number
          updated_at?: string
          views?: number
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          category_id?: string
          collection_id?: string
          created_at?: string
          id?: string
          images?: string[]
          material?: string | null
          name?: string
          occasion?: string | null
          price?: number
          returns?: number
          revenue?: number | null
          search_vector?: unknown
          serial?: number
          silhouette?: string | null
          status?: Database["public"]["Enums"]["style_status"]
          style_code?: string
          units_sold?: number
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "styles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "styles_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          barcode: string | null
          color_hex: string
          color_name: string
          price_override: number | null
          reserved: number
          size: string
          sku: string
          stock: number
          style_id: string
        }
        Insert: {
          barcode?: string | null
          color_hex: string
          color_name: string
          price_override?: number | null
          reserved?: number
          size: string
          sku: string
          stock?: number
          style_id: string
        }
        Update: {
          barcode?: string | null
          color_hex?: string
          color_name?: string
          price_override?: number | null
          reserved?: number
          size?: string
          sku?: string
          stock?: number
          style_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variants_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "style_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variants_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      style_list: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"] | null
          category_id: string | null
          collection_id: string | null
          colors: Json | null
          created_at: string | null
          id: string | null
          images: string[] | null
          low_count: number | null
          material: string | null
          name: string | null
          occasion: string | null
          oos_count: number | null
          price: number | null
          returns: number | null
          revenue: number | null
          serial: number | null
          silhouette: string | null
          sizes: string[] | null
          sku_count: number | null
          status: Database["public"]["Enums"]["style_status"] | null
          style_code: string | null
          total_stock: number | null
          units_sold: number | null
          views: number | null
        }
        Relationships: [
          {
            foreignKeyName: "styles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "styles_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      bulk_update_styles: {
        Args: { attribute: string; ids: string[]; value: string }
        Returns: number
      }
      dashboard_stats: { Args: never; Returns: Json }
      dashboard_trend: {
        Args: { granularity: string; range_start: string; range_end: string }
        Returns: Json
      }
      dashboard_trend_detail: {
        Args: { bucket_start: string; bucket_granularity: string }
        Returns: Json
      }
      f_unaccent: { Args: { "": string }; Returns: string }
      facet_counts: {
        Args: { collection?: string }
        Returns: {
          facet: string
          n: number
          value: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      search_skus: {
        Args: {
          in_stock_only?: boolean
          max_rows?: number
          only_active?: boolean
          q: string
        }
        Returns: {
          barcode: string
          color_hex: string
          color_name: string
          price: number
          score: number
          size: string
          sku: string
          stock: number
          style_code: string
          style_id: string
          style_name: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      body_type:
        | "hourglass"
        | "pear"
        | "apple"
        | "rectangle"
        | "inverted-triangle"
      order_channel: "Web" | "Boutique" | "Instagram" | "Wholesale"
      order_status:
        | "Pending"
        | "Processing"
        | "Shipped"
        | "Delivered"
        | "Returned"
        | "Cancelled"
      segment: "VIP" | "Loyal" | "Regular" | "New" | "At-risk"
      style_status: "active" | "draft" | "archived"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      body_type: [
        "hourglass",
        "pear",
        "apple",
        "rectangle",
        "inverted-triangle",
      ],
      order_channel: ["Web", "Boutique", "Instagram", "Wholesale"],
      order_status: [
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Returned",
        "Cancelled",
      ],
      segment: ["VIP", "Loyal", "Regular", "New", "At-risk"],
      style_status: ["active", "draft", "archived"],
    },
  },
} as const

