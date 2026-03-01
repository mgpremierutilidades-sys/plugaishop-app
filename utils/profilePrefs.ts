import { storageGetJSON, storageSetJSON } from "../lib/storage";

const KEY = "@plugaishop:profile_prefs:v1";

export type ProfilePrefsV1 = {
  v: 1;
  updatedAt: number;
  prefs: {
    notificationsEnabled: boolean;
    compactMode: boolean;
    marketingOptIn: boolean;
  };
};

export type ProfilePrefs = ProfilePrefsV1["prefs"];

export const DEFAULT_PREFS: ProfilePrefs = {
  notificationsEnabled: true,
  compactMode: false,
  marketingOptIn: false,
};

export async function loadProfilePrefs(): Promise<ProfilePrefs> {
  const data = await storageGetJSON<ProfilePrefsV1>(KEY);
  if (!data || data.v !== 1 || !data.prefs) return DEFAULT_PREFS;

  return {
    notificationsEnabled: !!data.prefs.notificationsEnabled,
    compactMode: !!data.prefs.compactMode,
    marketingOptIn: !!data.prefs.marketingOptIn,
  };
}

export async function saveProfilePrefs(prefs: ProfilePrefs) {
  const payload: ProfilePrefsV1 = {
    v: 1,
    updatedAt: Date.now(),
    prefs: {
      notificationsEnabled: !!prefs.notificationsEnabled,
      compactMode: !!prefs.compactMode,
      marketingOptIn: !!prefs.marketingOptIn,
    },
  };

  return storageSetJSON(KEY, payload);
}