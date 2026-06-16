import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export type LockerCategory = "all" | "5" | "7" | "11" | "custom" | "tactics";

type SavedLineupBase = {
  id: string;
  user_id: string;
  name: string;
  format: string;
  players_data: unknown;
  created_at: string;
};

type LockerRoomCopy = {
  deleted: string;
};

type UseLockerRoomDataOptions = {
  user: User | null;
  copy: LockerRoomCopy;
  getErrorMessage: (error: unknown) => string;
  showToast: (message: string, tone?: "success" | "error") => void;
};

export function useLockerRoomData<TLineup extends SavedLineupBase>({
  user,
  copy,
  getErrorMessage,
  showToast,
}: UseLockerRoomDataOptions) {
  const [savedLineups, setSavedLineups] = useState<TLineup[]>([]);
  const [lockerCategory, setLockerCategory] = useState<LockerCategory>("all");
  const [lockerStatus, setLockerStatus] = useState("");
  const [isLockerLoading, setIsLockerLoading] = useState(false);
  const [deletingLineupId, setDeletingLineupId] = useState<string | null>(null);

  const fetchSavedLineups = async () => {
    if (!supabase || !user) {
      setSavedLineups([]);
      return;
    }

    setIsLockerLoading(true);
    const { data, error } = await supabase
      .from("lineups")
      .select("id,user_id,name,format,players_data,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setLockerStatus(getErrorMessage(error));
    } else {
      setSavedLineups((data ?? []) as TLineup[]);
    }
    setIsLockerLoading(false);
  };

  const deleteSavedLineup = async (id: string) => {
    if (!supabase || !user) return;

    setDeletingLineupId(id);
    const { error } = await supabase.from("lineups").delete().eq("id", id);
    if (error) {
      const message = getErrorMessage(error);
      setLockerStatus(message);
      showToast(message, "error");
    } else {
      setSavedLineups((current) => current.filter((lineup) => lineup.id !== id));
      showToast(copy.deleted);
    }
    setDeletingLineupId(null);
  };

  return {
    savedLineups,
    setSavedLineups,
    lockerCategory,
    setLockerCategory,
    lockerStatus,
    setLockerStatus,
    isLockerLoading,
    setIsLockerLoading,
    deletingLineupId,
    fetchSavedLineups,
    deleteSavedLineup,
  };
}
