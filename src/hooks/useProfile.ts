import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export type ProfileRecord = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  full_name: string | null;
  bio: string | null;
  favorite_team: string | null;
  favorite_position: string | null;
  location: string | null;
};

type ProfileCopy = {
  saved: string;
  avatarTooLarge: string;
  avatarUploadError: string;
  avatarUploaded: string;
};

type UseProfileOptions = {
  user: User | null;
  copy: ProfileCopy;
  setLockerStatus: Dispatch<SetStateAction<string>>;
  showToast: (message: string, tone?: "success" | "error") => void;
  getErrorMessage: (error: unknown) => string;
};

const profileColumns = "id,username,avatar_url,full_name,bio,favorite_team,favorite_position,location";

export function useProfile({ user, copy, setLockerStatus, showToast, getErrorMessage }: UseProfileOptions) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileFullName, setProfileFullName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileFavoriteTeam, setProfileFavoriteTeam] = useState("");
  const [profileFavoritePosition, setProfileFavoritePosition] = useState("");
  const [profileLocation, setProfileLocation] = useState("");
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const resetProfile = () => {
    setProfile(null);
    setProfileUsername("");
    setProfileAvatarUrl("");
    setProfileFullName("");
    setProfileBio("");
    setProfileFavoriteTeam("");
    setProfileFavoritePosition("");
    setProfileLocation("");
  };

  const applyProfile = (nextProfile: ProfileRecord | null) => {
    setProfile(nextProfile);
    setProfileUsername(nextProfile?.username ?? user?.user_metadata?.username ?? user?.email?.split("@")[0] ?? "");
    setProfileAvatarUrl(nextProfile?.avatar_url ?? user?.user_metadata?.avatar_url ?? "");
    setProfileFullName(nextProfile?.full_name ?? user?.user_metadata?.full_name ?? "");
    setProfileBio(nextProfile?.bio ?? "");
    setProfileFavoriteTeam(nextProfile?.favorite_team ?? "");
    setProfileFavoritePosition(nextProfile?.favorite_position ?? "");
    setProfileLocation(nextProfile?.location ?? "");
  };

  const fetchProfile = async () => {
    if (!supabase || !user) {
      resetProfile();
      return;
    }

    const { data, error } = await supabase.from("profiles").select(profileColumns).eq("id", user.id).maybeSingle();

    if (error) {
      setLockerStatus(getErrorMessage(error));
      return;
    }

    applyProfile(data as ProfileRecord | null);
  };

  const buildProfilePayload = (overrides?: { avatar_url?: string | null }) => ({
    id: user!.id,
    username: profileUsername.trim() || user!.email?.split("@")[0] || "",
    avatar_url: overrides && "avatar_url" in overrides ? overrides.avatar_url : profileAvatarUrl.trim() || null,
    full_name: profileFullName.trim() || null,
    bio: profileBio.trim() || null,
    favorite_team: profileFavoriteTeam.trim() || null,
    favorite_position: profileFavoritePosition.trim() || null,
    location: profileLocation.trim() || null,
  });

  const updateProfile = async () => {
    if (!supabase || !user) return;

    setLockerStatus("");
    setIsProfileLoading(true);
    const { data, error } = await supabase.from("profiles").upsert(buildProfilePayload()).select(profileColumns).single();

    if (error) {
      const message = getErrorMessage(error);
      setLockerStatus(message);
      showToast(message, "error");
      setIsProfileLoading(false);
      return;
    }

    setProfile(data as ProfileRecord);
    setLockerStatus(copy.saved);
    showToast(copy.saved);
    setIsProfileLoading(false);
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !supabase || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast(copy.avatarTooLarge, "error");
      return;
    }

    setIsAvatarUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type || undefined });

      if (uploadError) {
        showToast(copy.avatarUploadError, "error");
        setIsAvatarUploading(false);
        return;
      }

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${publicData.publicUrl}?v=${Date.now()}`;
      setProfileAvatarUrl(publicUrl);

      const { data, error } = await supabase
        .from("profiles")
        .upsert(buildProfilePayload({ avatar_url: publicUrl }))
        .select(profileColumns)
        .single();

      if (error) {
        showToast(getErrorMessage(error), "error");
        setIsAvatarUploading(false);
        return;
      }

      setProfile(data as ProfileRecord);
      showToast(copy.avatarUploaded);
    } catch {
      showToast(copy.avatarUploadError, "error");
    } finally {
      setIsAvatarUploading(false);
    }
  };

  return {
    profile,
    profileUsername,
    profileAvatarUrl,
    profileBio,
    profileFavoriteTeam,
    profileFavoritePosition,
    profileLocation,
    isAvatarUploading,
    isProfileLoading,
    avatarInputRef,
    setProfileUsername,
    setProfileBio,
    setProfileFavoriteTeam,
    setProfileFavoritePosition,
    setProfileLocation,
    fetchProfile,
    updateProfile,
    handleAvatarFileChange,
  };
}
