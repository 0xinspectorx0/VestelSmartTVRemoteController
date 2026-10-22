export interface TvDevice {
  id: string;
  name: string;
  ip: string;
  remotePort: number;
  discoveryPort: number;
  modelName?: string;
  lastConnectedAt?: number;
}

export interface FavoriteChannel {
  id: string;
  name: string;
  number: number;
  accent?: string;
}

export type NavigationMode = 'dpad' | 'touchpad';
export type RemoteTab = 'remote' | 'keypad' | 'media';

export interface AppSettings {
  hapticsEnabled: boolean;
  navigationMode: NavigationMode;
  demoMode: boolean;
}

export interface CommandFeedback {
  id: number;
  label: string;
  detail?: string;
  status: 'ok' | 'demo' | 'error' | 'sending';
}

export interface TvCheckResult {
  accessible: boolean;
  friendlyName?: string;
  modelName?: string;
  detectedRemotePort?: number;
  detectedDiscoveryPort?: number;
}

/**
 * Vestel Smart TV uzaktan kumanda tuş kodları (VestelTV/__init__.py ile birebir uyumlu)
 */
export const VESTEL_KEYS = {
  NUM_0: 1000,
  NUM_1: 1001,
  NUM_2: 1002,
  NUM_3: 1003,
  NUM_4: 1004,
  NUM_5: 1005,
  NUM_6: 1006,
  NUM_7: 1007,
  NUM_8: 1008,
  NUM_9: 1009,
  BACK: 1010,
  POWER: 1012,
  MUTE: 1013,
  LANGUAGE: 1015,
  VOL_UP: 1016,
  VOL_DOWN: 1017,
  INFO: 1018,
  DOWN: 1019,
  UP: 1020,
  LEFT: 1021,
  RIGHT: 1022,
  STOP: 1024,
  PLAY: 1025,
  REWIND: 1027,
  FAST_FORWARD: 1028,
  SUBTITLE: 1031,
  CH_UP: 1032,
  CH_DOWN: 1033,
  SWAP: 1034,
  EXIT: 1037,
  THREE_D: 1040,
  Q_MENU: 1043,
  INTERNET: 1046,
  EPG: 1047,
  MENU: 1048,
  PAUSE: 1049,
  YELLOW: 1050,
  RECORD: 1051,
  BLUE: 1052,
  OK: 1053,
  GREEN: 1054,
  RED: 1055,
  SOURCE: 1056,
  MEDIA: 1057,
  TELETEXT: 1255,
} as const;

export type VestelKeyCode = (typeof VESTEL_KEYS)[keyof typeof VESTEL_KEYS];

export const PORT_PROFILES = [
  {
    id: 'classic',
    label: 'Standart (56791 / 56792)',
    description: 'Çoğu Vestel Smart TV modeli (MB90 - MB180)',
    remotePort: 56791,
    discoveryPort: 56792,
  },
  {
    id: 'modern',
    label: 'Yeni Nesil (56789 / 56790)',
    description: 'Bazı yeni şasi modeller (MB211 / MB230 / Qui)',
    remotePort: 56789,
    discoveryPort: 56790,
  },
] as const;

export const DEFAULT_FAVORITE_CHANNELS: FavoriteChannel[] = [
  { id: 'ch-1', name: 'TRT 1', number: 1, accent: '#EF4444' },
  { id: 'ch-2', name: 'ATV', number: 2, accent: '#F59E0B' },
  { id: 'ch-3', name: 'Kanal D', number: 3, accent: '#3B82F6' },
  { id: 'ch-4', name: 'Star', number: 4, accent: '#EF4444' },
  { id: 'ch-5', name: 'Show TV', number: 5, accent: '#8B5CF6' },
  { id: 'ch-6', name: 'NOW', number: 6, accent: '#EC4899' },
  { id: 'ch-7', name: 'Kanal 7', number: 7, accent: '#10B981' },
  { id: 'ch-8', name: 'TV8', number: 8, accent: '#F97316' },
];
