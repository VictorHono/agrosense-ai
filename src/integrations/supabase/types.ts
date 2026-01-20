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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agricultural_alerts: {
        Row: {
          created_at: string
          crop_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          region: string | null
          severity: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          crop_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          region?: string | null
          severity?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          crop_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          region?: string | null
          severity?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agricultural_alerts_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_history: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: []
      }
      crops: {
        Row: {
          category: string
          created_at: string
          description: string | null
          growing_season: string[] | null
          id: string
          name: string
          name_local: string | null
          regions: string[] | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          growing_season?: string[] | null
          id?: string
          name: string
          name_local?: string | null
          regions?: string[] | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          growing_season?: string[] | null
          id?: string
          name?: string
          name_local?: string | null
          regions?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      diseases: {
        Row: {
          causes: string[] | null
          created_at: string
          crop_id: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          name_local: string | null
          severity: string | null
          symptoms: string[] | null
          updated_at: string
        }
        Insert: {
          causes?: string[] | null
          created_at?: string
          crop_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          name_local?: string | null
          severity?: string | null
          symptoms?: string[] | null
          updated_at?: string
        }
        Update: {
          causes?: string[] | null
          created_at?: string
          crop_id?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          name_local?: string | null
          severity?: string | null
          symptoms?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diseases_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      farming_tips: {
        Row: {
          category: string
          content: string
          created_at: string
          crop_id: string | null
          id: string
          language: string
          priority: number | null
          region: string | null
          season: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          crop_id?: string | null
          id?: string
          language?: string
          priority?: number | null
          region?: string | null
          season?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          crop_id?: string | null
          id?: string
          language?: string
          priority?: number | null
          region?: string | null
          season?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farming_tips_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      market_prices: {
        Row: {
          created_at: string
          crop_id: string | null
          currency: string
          id: string
          market_name: string
          price_max: number
          price_min: number
          quality_grade: string | null
          recorded_at: string
          region: string
          unit: string
        }
        Insert: {
          created_at?: string
          crop_id?: string | null
          currency?: string
          id?: string
          market_name: string
          price_max: number
          price_min: number
          quality_grade?: string | null
          recorded_at?: string
          region: string
          unit?: string
        }
        Update: {
          created_at?: string
          crop_id?: string | null
          currency?: string
          id?: string
          market_name?: string
          price_max?: number
          price_min?: number
          quality_grade?: string | null
          recorded_at?: string
          region?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          application_method: string | null
          availability: string | null
          created_at: string
          description: string | null
          disease_id: string | null
          dosage: string | null
          id: string
          name: string
          price_range: string | null
          type: string
          updated_at: string
        }
        Insert: {
          application_method?: string | null
          availability?: string | null
          created_at?: string
          description?: string | null
          disease_id?: string | null
          dosage?: string | null
          id?: string
          name: string
          price_range?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          application_method?: string | null
          availability?: string | null
          created_at?: string
          description?: string | null
          disease_id?: string | null
          dosage?: string | null
          id?: string
          name?: string
          price_range?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "diseases"
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
