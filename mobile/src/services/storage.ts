import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppSettings,
  DEFAULT_FAVORITE_CHANNELS,
  FavoriteChannel,
  TvDevice,
} from '../types/tv';

const KEYS = {
  DEVICES: '@vestel_remote/devices_v1',
  ACTIVE_DEVICE_ID: '@vestel_remote/active_device_id_v1',
  FAVORITE_CHANNELS: '@vestel_remote/favorite_channels_v1',
  SETTINGS: '@vestel_remote/settings_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  hapticsEnabled: true,
  navigationMode: 'dpad',
  // Web önizlemede TV olmadan hemen test edilebilmesi için açık başlar; iOS'ta gerçek ağ modu varsayılandır
  demoMode: Platform.OS === 'web',
};

export interface PersistedState {
  devices: TvDevice[];
  activeDeviceId: string | null;
  favorites: FavoriteChannel[];
  settings: AppSettings;
}

export async function loadPersistedState(): Promise<PersistedState> {
  try {
    const [devicesRaw, activeId, favoritesRaw, settingsRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.DEVICES),
      AsyncStorage.getItem(KEYS.ACTIVE_DEVICE_ID),
      AsyncStorage.getItem(KEYS.FAVORITE_CHANNELS),
      AsyncStorage.getItem(KEYS.SETTINGS),
    ]);

    const devices: TvDevice[] = devicesRaw ? JSON.parse(devicesRaw) : [];
    const favorites: FavoriteChannel[] = favoritesRaw
      ? JSON.parse(favoritesRaw)
      : DEFAULT_FAVORITE_CHANNELS;
    const settings: AppSettings = settingsRaw
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) }
      : DEFAULT_SETTINGS;

    return {
      devices,
      activeDeviceId: activeId || (devices[0]?.id ?? null),
      favorites,
      settings,
    };
  } catch {
    return {
      devices: [],
      activeDeviceId: null,
      favorites: DEFAULT_FAVORITE_CHANNELS,
      settings: DEFAULT_SETTINGS,
    };
  }
}

export async function saveDevicesState(
  devices: TvDevice[],
  activeDeviceId: string | null
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.DEVICES, JSON.stringify(devices));
    if (activeDeviceId) {
      await AsyncStorage.setItem(KEYS.ACTIVE_DEVICE_ID, activeDeviceId);
    } else {
      await AsyncStorage.removeItem(KEYS.ACTIVE_DEVICE_ID);
    }
  } catch {
    // Depolama hatalarını yut
  }
}

export async function saveFavoriteChannels(favorites: FavoriteChannel[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.FAVORITE_CHANNELS, JSON.stringify(favorites));
  } catch {
    // Depolama hatalarını yut
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Depolama hatalarını yut
  }
}
