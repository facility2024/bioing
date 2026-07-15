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
      categorias: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      configuracoes_empresa: {
        Row: {
          created_at: string
          email_contato: string | null
          endereco_empresa: string | null
          id: string
          logo_url: string | null
          nome_empresa: string | null
          updated_at: string
          whatsapp_atendimento: string | null
        }
        Insert: {
          created_at?: string
          email_contato?: string | null
          endereco_empresa?: string | null
          id?: string
          logo_url?: string | null
          nome_empresa?: string | null
          updated_at?: string
          whatsapp_atendimento?: string | null
        }
        Update: {
          created_at?: string
          email_contato?: string | null
          endereco_empresa?: string | null
          id?: string
          logo_url?: string | null
          nome_empresa?: string | null
          updated_at?: string
          whatsapp_atendimento?: string | null
        }
        Relationships: []
      }
      configuracoes_envio: {
        Row: {
          created_at: string
          delay_segundos: number
          id: string
          updated_at: string
          whatsapp_destino: string | null
        }
        Insert: {
          created_at?: string
          delay_segundos?: number
          id?: string
          updated_at?: string
          whatsapp_destino?: string | null
        }
        Update: {
          created_at?: string
          delay_segundos?: number
          id?: string
          updated_at?: string
          whatsapp_destino?: string | null
        }
        Relationships: []
      }
      configuracoes_whatsapp: {
        Row: {
          api_token: string | null
          ativa: boolean
          created_at: string
          id: string
          instance_id: string | null
          numero_conectado: string | null
          updated_at: string
        }
        Insert: {
          api_token?: string | null
          ativa?: boolean
          created_at?: string
          id?: string
          instance_id?: string | null
          numero_conectado?: string | null
          updated_at?: string
        }
        Update: {
          api_token?: string | null
          ativa?: boolean
          created_at?: string
          id?: string
          instance_id?: string | null
          numero_conectado?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      enderecos: {
        Row: {
          bairro: string
          cep: string | null
          cidade: string
          cliente_id: string
          complemento: string | null
          created_at: string
          estado: string
          id: string
          numero: string
          rua: string
        }
        Insert: {
          bairro: string
          cep?: string | null
          cidade: string
          cliente_id: string
          complemento?: string | null
          created_at?: string
          estado: string
          id?: string
          numero: string
          rua: string
        }
        Update: {
          bairro?: string
          cep?: string | null
          cidade?: string
          cliente_id?: string
          complemento?: string | null
          created_at?: string
          estado?: string
          id?: string
          numero?: string
          rua?: string
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      home_slides: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          imagem_url: string
          link_url: string | null
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          imagem_url: string
          link_url?: string | null
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          imagem_url?: string
          link_url?: string | null
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      itens_pedido: {
        Row: {
          created_at: string
          id: string
          pedido_id: string
          produto_descricao: string | null
          produto_id: string | null
          produto_nome: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          id?: string
          pedido_id: string
          produto_descricao?: string | null
          produto_id?: string | null
          produto_nome: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Update: {
          created_at?: string
          id?: string
          pedido_id?: string
          produto_descricao?: string | null
          produto_id?: string | null
          produto_nome?: string
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string
          created_at: string
          endereco_id: string | null
          id: string
          numero: string
          observacoes: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          endereco_id?: string | null
          id?: string
          numero?: string
          observacoes?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          endereco_id?: string | null
          id?: string
          numero?: string
          observacoes?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_endereco_id_fkey"
            columns: ["endereco_id"]
            isOneToOne: false
            referencedRelation: "enderecos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          controla_estoque: boolean
          created_at: string
          descricao: string | null
          estoque: number
          id: string
          imagem_url: string | null
          imagens: string[]
          nome: string
          preco: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          controla_estoque?: boolean
          created_at?: string
          descricao?: string | null
          estoque?: number
          id?: string
          imagem_url?: string | null
          imagens?: string[]
          nome: string
          preco: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          controla_estoque?: boolean
          created_at?: string
          descricao?: string | null
          estoque?: number
          id?: string
          imagem_url?: string | null
          imagens?: string[]
          nome?: string
          preco?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gerar_numero_pedido: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
