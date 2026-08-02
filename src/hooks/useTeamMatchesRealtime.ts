import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { mapTeamMatchRow } from "../repositories/teamRepository";
import { sortTeamMatches } from "../teamMatchSchedule";
import type { TeamMatch } from "../types/team";

type UseTeamMatchesRealtimeOptions = {
  teamId: string;
  enabled?: boolean;
  setMatches: Dispatch<SetStateAction<TeamMatch[]>>;
  onResync?: () => void;
};

export function useTeamMatchesRealtime({
  teamId,
  enabled = true,
  setMatches,
  onResync,
}: UseTeamMatchesRealtimeOptions) {
  const setMatchesRef = useRef(setMatches);
  const onResyncRef = useRef(onResync);
  setMatchesRef.current = setMatches;
  onResyncRef.current = onResync;

  useEffect(() => {
    if (!enabled || !teamId || !supabase) return;
    const client = supabase;

    const applyInsertOrUpdate = (row: Record<string, unknown> | undefined) => {
      const match = mapTeamMatchRow(row);
      if (!match || match.team_id !== teamId) {
        onResyncRef.current?.();
        return;
      }

      setMatchesRef.current((current) =>
        sortTeamMatches([...current.filter((item) => item.id !== match.id), match]),
      );
    };

    const applyDelete = (row: Record<string, unknown> | undefined) => {
      const deletedId = typeof row?.id === "string" ? row.id : null;
      if (!deletedId) {
        onResyncRef.current?.();
        return;
      }

      setMatchesRef.current((current) => current.filter((item) => item.id !== deletedId));
    };

    const handlePayload = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
        applyInsertOrUpdate(payload.new);
        return;
      }

      if (payload.eventType === "DELETE") {
        applyDelete(payload.old);
      }
    };

    const channel = client
      .channel(`team-matches:${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_matches",
          filter: `team_id=eq.${teamId}`,
        },
        handlePayload,
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "team_matches",
          filter: `team_id=eq.${teamId}`,
        },
        handlePayload,
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "team_matches",
          filter: `team_id=eq.${teamId}`,
        },
        handlePayload,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          onResyncRef.current?.();
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled, teamId]);
}
