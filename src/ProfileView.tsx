import type { ChangeEvent, RefObject } from "react";
import type { User } from "@supabase/supabase-js";
import { Pencil } from "lucide-react";
import styles from "./ProfileView.module.css";

type ProfileCopy = {
  profileTitle: string;
  signIn: string;
  supabaseMissing: string;
  changeAvatar: string;
  uploadingAvatar: string;
  profileSubtitle: string;
  username: string;
  favoriteTeam: string;
  favoritePosition: string;
  location: string;
  bio: string;
  profileFieldsHint: string;
  updateProfile: string;
};

type ProfileViewProps = {
  copy: ProfileCopy;
  user: User | null;
  isSupabaseConfigured: boolean;
  profileUsername: string;
  profileAvatarUrl: string;
  profileBio: string;
  profileFavoriteTeam: string;
  profileFavoritePosition: string;
  profileLocation: string;
  isAvatarUploading: boolean;
  isProfileLoading: boolean;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onProfileUsernameChange: (value: string) => void;
  onProfileBioChange: (value: string) => void;
  onProfileFavoriteTeamChange: (value: string) => void;
  onProfileFavoritePositionChange: (value: string) => void;
  onProfileLocationChange: (value: string) => void;
  onUpdateProfile: () => void;
};

function ButtonSpinner() {
  return <span className="button-spinner" aria-hidden="true" />;
}

export function ProfileView({
  copy,
  user,
  isSupabaseConfigured,
  profileUsername,
  profileAvatarUrl,
  profileBio,
  profileFavoriteTeam,
  profileFavoritePosition,
  profileLocation,
  isAvatarUploading,
  isProfileLoading,
  avatarInputRef,
  onAvatarFileChange,
  onProfileUsernameChange,
  onProfileBioChange,
  onProfileFavoriteTeamChange,
  onProfileFavoritePositionChange,
  onProfileLocationChange,
  onUpdateProfile,
}: ProfileViewProps) {
  return (
    <section className={styles.profileRoom}>
      <div className={styles.profilePanel}>
        <div className="panel-heading">
          <span>{copy.profileTitle}</span>
          <strong>{user?.email ?? copy.signIn}</strong>
        </div>
        {!isSupabaseConfigured ? (
          <p className={styles.message}>{copy.supabaseMissing}</p>
        ) : !user ? (
          <p className={styles.message}>{copy.signIn}</p>
        ) : (
          <div className={styles.profileCard}>
            <div className={styles.profileHero}>
              <button
                type="button"
                className={styles.profileAvatar}
                onClick={() => avatarInputRef.current?.click()}
                disabled={isAvatarUploading}
                aria-label={copy.changeAvatar}
              >
                {profileAvatarUrl ? (
                  <img src={profileAvatarUrl} alt="" />
                ) : (
                  <span className={styles.profileAvatarInitials}>
                    {(profileUsername || user.email || "?").trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <span className={styles.profileAvatarOverlay}>
                  {isAvatarUploading ? <ButtonSpinner /> : <Pencil size={16} />}
                </span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onAvatarFileChange}
              />
              <div className={styles.profileHeroInfo}>
                <strong>{profileUsername || user.email}</strong>
                <span>{user.email}</span>
                <button
                  type="button"
                  className={styles.profileAvatarTrigger}
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isAvatarUploading}
                >
                  {isAvatarUploading ? copy.uploadingAvatar : copy.changeAvatar}
                </button>
              </div>
            </div>

            <p className={styles.profileSubtitle}>{copy.profileSubtitle}</p>

            <div className={styles.profileGrid}>
              <label className={styles.profileField}>
                <span>{copy.username}</span>
                <input value={profileUsername} onChange={(event) => onProfileUsernameChange(event.target.value)} placeholder={copy.username} />
              </label>
              <label className={styles.profileField}>
                <span>{copy.favoriteTeam}</span>
                <input value={profileFavoriteTeam} onChange={(event) => onProfileFavoriteTeamChange(event.target.value)} placeholder={copy.favoriteTeam} />
              </label>
              <label className={styles.profileField}>
                <span>{copy.favoritePosition}</span>
                <input value={profileFavoritePosition} onChange={(event) => onProfileFavoritePositionChange(event.target.value)} placeholder={copy.favoritePosition} />
              </label>
              <label className={styles.profileField}>
                <span>{copy.location}</span>
                <input value={profileLocation} onChange={(event) => onProfileLocationChange(event.target.value)} placeholder={copy.location} />
              </label>
              <label className={`${styles.profileField} ${styles.profileFieldFull}`}>
                <span>{copy.bio}</span>
                <textarea
                  value={profileBio}
                  onChange={(event) => onProfileBioChange(event.target.value)}
                  placeholder={copy.bio}
                  rows={3}
                  maxLength={280}
                />
              </label>
            </div>

            <p className={styles.profileHint}>{copy.profileFieldsHint}</p>

            <button type="button" className={styles.profileSave} onClick={onUpdateProfile} disabled={isProfileLoading}>
              {isProfileLoading ? <ButtonSpinner /> : null}
              {copy.updateProfile}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
