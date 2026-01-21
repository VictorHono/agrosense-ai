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
      app_languages: {
        Row: {
          code: string
          created_at: string
          flag: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          native_name: string
          translation_progress: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          flag?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          native_name: string
          translation_progress?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          flag?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          native_name?: string
          translation_progress?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      app_translations: {
        Row: {
          category: string | null
          created_at: string
          id: string
          language_code: string
          translation_key: string
          translation_value: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          language_code: string
          translation_key: string
          translation_value: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          language_code?: string
          translation_key?: string
          translation_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "app_languages"
            referencedColumns: ["code"]
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
      diagnosis_learning: {
        Row: {
          altitude: number | null
          causes: Json | null
          climate_zone: string | null
          confidence: number | null
          created_at: string
          crop_local_name: string | null
          crop_name: string
          disease_local_name: string | null
          disease_name: string | null
          id: string
          is_healthy: boolean | null
          language: string | null
          last_matched_at: string | null
          latitude: number | null
          longitude: number | null
          nearest_city: string | null
          prevention: Json | null
          region: string | null
          season: string | null
          severity: string | null
          source: string | null
          symptoms: Json | null
          treatments: Json | null
          updated_at: string
          use_count: number | null
          verification_notes: string | null
          verified: boolean | null
          verified_by: string | null
          weather_conditions: Json | null
        }
        Insert: {
          altitude?: number | null
          causes?: Json | null
          climate_zone?: string | null
          confidence?: number | null
          created_at?: string
          crop_local_name?: string | null
          crop_name: string
          disease_local_name?: string | null
          disease_name?: string | null
          id?: string
          is_healthy?: boolean | null
          language?: string | null
          last_matched_at?: string | null
          latitude?: number | null
          longitude?: number | null
          nearest_city?: string | null
          prevention?: Json | null
          region?: string | null
          season?: string | null
          severity?: string | null
          source?: string | null
          symptoms?: Json | null
          treatments?: Json | null
          updated_at?: string
          use_count?: number | null
          verification_notes?: string | null
          verified?: boolean | null
          verified_by?: string | null
          weather_conditions?: Json | null
        }
        Update: {
          altitude?: number | null
          causes?: Json | null
          climate_zone?: string | null
          confidence?: number | null
          created_at?: string
          crop_local_name?: string | null
          crop_name?: string
          disease_local_name?: string | null
          disease_name?: string | null
          id?: string
          is_healthy?: boolean | null
          language?: string | null
          last_matched_at?: string | null
          latitude?: number | null
          longitude?: number | null
          nearest_city?: string | null
          prevention?: Json | null
          region?: string | null
          season?: string | null
          severity?: string | null
          source?: string | null
          symptoms?: Json | null
          treatments?: Json | null
          updated_at?: string
          use_count?: number | null
          verification_notes?: string | null
          verified?: boolean | null
          verified_by?: string | null
          weather_conditions?: Json | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_activity: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
