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
      chat_channels: {
        Row: {
          club_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          club_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          club_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          author_membership_id: string
          body: string
          channel_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_membership_id: string
          body: string
          channel_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_membership_id?: string
          body?: string
          channel_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_author_membership_id_fkey"
            columns: ["author_membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      club_invitations: {
        Row: {
          accepted_at: string | null
          club_id: string
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          role: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          club_id: string
          created_at?: string
          created_by: string
          email: string
          expires_at: string
          id?: string
          role?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          club_id?: string
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          role?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_invitations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_memberships: {
        Row: {
          club_id: string
          created_at: string
          id: string
          joined_at: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          joined_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_memberships_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          city: string | null
          contact_email: string | null
          created_at: string
          description: string | null
          id: string
          logo_path: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          city?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_path?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_path?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      dance_skills: {
        Row: {
          created_at: string
          dance_id: string
          id: string
          membership_id: string
        }
        Insert: {
          created_at?: string
          dance_id: string
          id?: string
          membership_id: string
        }
        Update: {
          created_at?: string
          dance_id?: string
          id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dance_skills_dance_id_fkey"
            columns: ["dance_id"]
            isOneToOne: false
            referencedRelation: "dances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dance_skills_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      dances: {
        Row: {
          category: string | null
          choreographer: string | null
          club_id: string
          counts: number | null
          created_at: string
          difficulty: string | null
          id: string
          image_path: string | null
          motion: string | null
          music: string | null
          name: string
          notes: string | null
          rhythm: string | null
          stepsheet_url: string | null
          updated_at: string
          video_url: string | null
          walls: number | null
        }
        Insert: {
          category?: string | null
          choreographer?: string | null
          club_id: string
          counts?: number | null
          created_at?: string
          difficulty?: string | null
          id?: string
          image_path?: string | null
          motion?: string | null
          music?: string | null
          name: string
          notes?: string | null
          rhythm?: string | null
          stepsheet_url?: string | null
          updated_at?: string
          video_url?: string | null
          walls?: number | null
        }
        Update: {
          category?: string | null
          choreographer?: string | null
          club_id?: string
          counts?: number | null
          created_at?: string
          difficulty?: string | null
          id?: string
          image_path?: string | null
          motion?: string | null
          music?: string | null
          name?: string
          notes?: string | null
          rhythm?: string | null
          stepsheet_url?: string | null
          updated_at?: string
          video_url?: string | null
          walls?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dances_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string
          club_id: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          image_path: string | null
          location: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          club_id: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_path?: string | null
          location?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          club_id?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_path?: string | null
          location?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          created_at: string
          group_id: string
          membership_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          membership_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      group_trainers: {
        Row: {
          created_at: string
          group_id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_trainers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_trainers_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          capacity: number | null
          club_id: string
          color: string | null
          created_at: string
          dance_style: string | null
          description: string | null
          id: string
          level: string
          name: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          club_id: string
          color?: string | null
          created_at?: string
          dance_style?: string | null
          description?: string | null
          id?: string
          level: string
          name: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          club_id?: string
          color?: string | null
          created_at?: string
          dance_style?: string | null
          description?: string | null
          id?: string
          level?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      trainers: {
        Row: {
          biography: string | null
          club_id: string
          contact_email: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          photo_path: string | null
          specializations: string[]
          updated_at: string
        }
        Insert: {
          biography?: string | null
          club_id: string
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          photo_path?: string | null
          specializations?: string[]
          updated_at?: string
        }
        Update: {
          biography?: string | null
          club_id?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          photo_path?: string | null
          specializations?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainers_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_attendance: {
        Row: {
          created_at: string
          id: string
          membership_id: string
          response: string
          training_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          membership_id: string
          response: string
          training_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          membership_id?: string
          response?: string
          training_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_attendance_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "club_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendance_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          club_id: string
          created_at: string
          ends_at: string | null
          group_id: string
          id: string
          location: string | null
          notes: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          ends_at?: string | null
          group_id: string
          id?: string
          location?: string | null
          notes?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          ends_at?: string | null
          group_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_club_invitation: {
        Args: { p_invitation_token: string }
        Returns: {
          club_id: string
          created_at: string
          id: string
          joined_at: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "club_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_club_invitation: {
        Args: { p_club_id: string; p_email: string; p_role?: string }
        Returns: {
          expires_at: string
          invitation_id: string
          invitation_token: string
        }[]
      }
      create_club_with_admin: {
        Args: { p_city?: string; p_description?: string; p_name: string }
        Returns: {
          city: string | null
          contact_email: string | null
          created_at: string
          description: string | null
          id: string
          logo_path: string | null
          name: string
          updated_at: string
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "clubs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_club_statistics: {
        Args: { p_club_id: string; p_from: string; p_to: string }
        Returns: Json
      }
      is_active_club_member: {
        Args: { target_club_id: string }
        Returns: boolean
      }
      is_club_admin: { Args: { target_club_id: string }; Returns: boolean }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
