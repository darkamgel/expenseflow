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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      budgets: {
        Row: {
          created_at: number
          id: string
          is_sample: boolean
          month: number
          notes: string | null
          rollover_enabled: boolean
          total_amount: number
          updated_at: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: number
          id?: string
          is_sample?: boolean
          month: number
          notes?: string | null
          rollover_enabled?: boolean
          total_amount: number
          updated_at?: number
          user_id?: string
          year: number
        }
        Update: {
          created_at?: number
          id?: string
          is_sample?: boolean
          month?: number
          notes?: string | null
          rollover_enabled?: boolean
          total_amount?: number
          updated_at?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string
          created_at: number
          icon: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
          status: string
          updated_at: number
          user_id: string
        }
        Insert: {
          color: string
          created_at?: number
          icon: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          status?: string
          updated_at?: number
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: number
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          status?: string
          updated_at?: number
          user_id?: string
        }
        Relationships: []
      }
      category_budgets: {
        Row: {
          budget_id: string
          category_id: string
          created_at: number
          id: string
          is_sample: boolean
          planned_amount: number
          updated_at: number
          user_id: string
        }
        Insert: {
          budget_id: string
          category_id: string
          created_at?: number
          id?: string
          is_sample?: boolean
          planned_amount: number
          updated_at?: number
          user_id?: string
        }
        Update: {
          budget_id?: string
          category_id?: string
          created_at?: number
          id?: string
          is_sample?: boolean
          planned_amount?: number
          updated_at?: number
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string
          created_at: number
          date: string
          id: string
          is_sample: boolean
          merchant: string | null
          notes: string | null
          payment_method_id: string | null
          receipt_id: string | null
          recurring_expense_id: string | null
          tags: string[]
          time: string
          title: string
          updated_at: number
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: number
          date: string
          id?: string
          is_sample?: boolean
          merchant?: string | null
          notes?: string | null
          payment_method_id?: string | null
          receipt_id?: string | null
          recurring_expense_id?: string | null
          tags?: string[]
          time?: string
          title: string
          updated_at?: number
          user_id?: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: number
          date?: string
          id?: string
          is_sample?: boolean
          merchant?: string | null
          notes?: string | null
          payment_method_id?: string | null
          receipt_id?: string | null
          recurring_expense_id?: string | null
          tags?: string[]
          time?: string
          title?: string
          updated_at?: number
          user_id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          category: string | null
          created_at: number
          date: string
          id: string
          is_sample: boolean
          notes: string | null
          recurring: boolean
          source: string | null
          title: string
          updated_at: number
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: number
          date: string
          id?: string
          is_sample?: boolean
          notes?: string | null
          recurring?: boolean
          source?: string | null
          title: string
          updated_at?: number
          user_id?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: number
          date?: string
          id?: string
          is_sample?: boolean
          notes?: string | null
          recurring?: boolean
          source?: string | null
          title?: string
          updated_at?: number
          user_id?: string
        }
        Relationships: []
      }
      metadata: {
        Row: {
          key: string
          updated_at: number
          user_id: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: number
          user_id?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: number
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: number
          dedupe_key: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          title: string
          type: string
          updated_at: number
          user_id: string
        }
        Insert: {
          created_at?: number
          dedupe_key: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          title: string
          type: string
          updated_at?: number
          user_id?: string
        }
        Update: {
          created_at?: number
          dedupe_key?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          title?: string
          type?: string
          updated_at?: number
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          billing_cycle_start_day: number | null
          color: string
          created_at: number
          credit_limit: number | null
          current_balance: number | null
          id: string
          is_sample: boolean
          issuer: string | null
          last_four_digits: string | null
          name: string
          notes: string | null
          payment_due_day: number | null
          status: string
          type: string
          updated_at: number
          user_id: string
        }
        Insert: {
          billing_cycle_start_day?: number | null
          color: string
          created_at?: number
          credit_limit?: number | null
          current_balance?: number | null
          id?: string
          is_sample?: boolean
          issuer?: string | null
          last_four_digits?: string | null
          name: string
          notes?: string | null
          payment_due_day?: number | null
          status?: string
          type: string
          updated_at?: number
          user_id?: string
        }
        Update: {
          billing_cycle_start_day?: number | null
          color?: string
          created_at?: number
          credit_limit?: number | null
          current_balance?: number | null
          id?: string
          is_sample?: boolean
          issuer?: string | null
          last_four_digits?: string | null
          name?: string
          notes?: string | null
          payment_due_day?: number | null
          status?: string
          type?: string
          updated_at?: number
          user_id?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          created_at: number
          expense_id: string
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at: number
          user_id: string
        }
        Insert: {
          created_at?: number
          expense_id: string
          file_name: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          updated_at?: number
          user_id?: string
        }
        Update: {
          created_at?: number
          expense_id?: string
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          updated_at?: number
          user_id?: string
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          active: boolean
          amount: number
          auto_generate: boolean
          category_id: string
          created_at: number
          custom_interval_days: number | null
          end_date: string | null
          frequency: string
          id: string
          is_sample: boolean
          last_generated_date: string | null
          next_occurrence: string
          notes: string | null
          payment_method_id: string | null
          reminder_enabled: boolean
          start_date: string
          title: string
          updated_at: number
          user_id: string
        }
        Insert: {
          active?: boolean
          amount: number
          auto_generate?: boolean
          category_id: string
          created_at?: number
          custom_interval_days?: number | null
          end_date?: string | null
          frequency: string
          id?: string
          is_sample?: boolean
          last_generated_date?: string | null
          next_occurrence: string
          notes?: string | null
          payment_method_id?: string | null
          reminder_enabled?: boolean
          start_date: string
          title: string
          updated_at?: number
          user_id?: string
        }
        Update: {
          active?: boolean
          amount?: number
          auto_generate?: boolean
          category_id?: string
          created_at?: number
          custom_interval_days?: number | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_sample?: boolean
          last_generated_date?: string | null
          next_occurrence?: string
          notes?: string | null
          payment_method_id?: string | null
          reminder_enabled?: boolean
          start_date?: string
          title?: string
          updated_at?: number
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          auto_generate_recurring: boolean
          created_at: number
          currency: string
          default_monthly_budget: number
          display_name: string
          first_day_of_budget_month: number
          large_expense_threshold: number
          onboarding_completed: boolean
          starting_balance: number
          updated_at: number
          user_id: string
        }
        Insert: {
          auto_generate_recurring?: boolean
          created_at?: number
          currency?: string
          default_monthly_budget?: number
          display_name?: string
          first_day_of_budget_month?: number
          large_expense_threshold?: number
          onboarding_completed?: boolean
          starting_balance?: number
          updated_at?: number
          user_id?: string
        }
        Update: {
          auto_generate_recurring?: boolean
          created_at?: number
          currency?: string
          default_monthly_budget?: number
          display_name?: string
          first_day_of_budget_month?: number
          large_expense_threshold?: number
          onboarding_completed?: boolean
          starting_balance?: number
          updated_at?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      epoch_ms: { Args: never; Returns: number }
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
