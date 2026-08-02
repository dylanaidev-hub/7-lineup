import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "./lib/supabaseClient";
import type { SavedLineupRecord } from "./lineupState";

type SaveLineupRecordArgs = {
  supabase: SupabaseClient;
  user: User;
  name: string;
  format: string;
  playersData: SavedLineupRecord["players_data"];
};

export async function saveLineupRecord({ supabase, user, name, format, playersData }: SaveLineupRecordArgs) {
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    username: user.user_metadata?.username ?? user.email?.split("@")[0] ?? "",
    avatar_url: user.user_metadata?.avatar_url ?? null,
  });
  if (profileError) return { error: profileError };

  const { error } = await supabase.from("lineups").insert({
    user_id: user.id,
    name,
    format,
    players_data: playersData,
  });
  return { error };
}

export async function fetchSavedLineups() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase
    .from("lineups")
    .select("id,user_id,name,format,players_data,created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SavedLineupRecord[];
}
