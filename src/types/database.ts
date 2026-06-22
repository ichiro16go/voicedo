// Supabase generated types are produced via:
//   pnpm dlx supabase gen types typescript --project-id <id> > src/types/database.ts
// This stub keeps the client typed until the first migration is applied.

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          ended_at: string | null;
          audio_path: string | null;
          transcript: string | null;
          persona: "hal" | "roi";
          status: "recording" | "transcribing" | "generating" | "ready" | "failed";
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["sessions"]["Row"],
          "id" | "created_at" | "ended_at" | "audio_path" | "transcript" | "status"
        > & { id?: string; status?: Database["public"]["Tables"]["sessions"]["Row"]["status"] };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Row"]>;
      };
      turns: {
        Row: {
          id: string;
          session_id: string;
          turn_index: number;
          role: "user" | "assistant";
          content: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["turns"]["Row"], "id" | "created_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["turns"]["Row"]>;
      };
      articles: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          title: string;
          body_md: string;
          status: "draft" | "user_edited" | "exported";
          model: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["articles"]["Row"], "id" | "created_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["articles"]["Row"]>;
      };
      deletions: {
        Row: {
          id: string;
          user_id: string;
          requested_at: string;
          immediate_done_at: string | null;
          delayed_done_at: string | null;
          scope: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["deletions"]["Row"],
          "id" | "requested_at" | "immediate_done_at" | "delayed_done_at"
        > & { id?: string };
        Update: Partial<Database["public"]["Tables"]["deletions"]["Row"]>;
      };
      billing_events: {
        Row: {
          id: string;
          stripe_event_id: string;
          user_id: string | null;
          type: string;
          payload: unknown;
          received_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["billing_events"]["Row"],
          "id" | "received_at"
        > & { id?: string };
        Update: Partial<Database["public"]["Tables"]["billing_events"]["Row"]>;
      };
    };
  };
};
