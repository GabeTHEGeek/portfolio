import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: number;
          title: string;
          content: string;
          source_url: string | null;
          source_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          title: string;
          content: string;
          source_url?: string | null;
          source_type: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          title?: string;
          content?: string;
          source_url?: string | null;
          source_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_chunks: {
        Row: {
          id: number;
          document_id: number;
          chunk_index: number;
          content: string;
          title: string;
          source_url: string | null;
          source_type: string;
          embedding: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          document_id: number;
          chunk_index: number;
          content: string;
          title: string;
          source_url?: string | null;
          source_type: string;
          embedding: string | number[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          document_id?: number;
          chunk_index?: number;
          content?: string;
          title?: string;
          source_url?: string | null;
          source_type?: string;
          embedding?: string | number[];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_document_chunks: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
        };
        Returns: Array<{
          id: number;
          document_id: number;
          chunk_index: number;
          content: string;
          title: string;
          source_url: string | null;
          source_type: string;
          similarity: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let client: SupabaseClient<Database> | undefined;

/** Server-only client. Import this helper only from Netlify functions. */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY.');
  }

  client = createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  return client;
}
