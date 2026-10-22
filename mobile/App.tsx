import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import {
  AppSettings,
  CommandFeedback,
  DEFAULT_FAVORITE_CHANNELS,
  FavoriteChannel,
  RemoteTab,
  TvDevice,
  VESTEL_KEYS,
  VestelKeyCode,
} from './src/types/tv';
import {
  changeVolumeBatch,
  checkTvAccessible,
  goToChannelSequence,
  launchApplication,
  sendKeyCode,
} from './src/services/vestelApi';
import {
  loadPersistedState,
  saveAppSettings,
  saveDevicesState,
  saveFavoriteChannels,
} from './src/services/storage';
import { HapticStrength, triggerHaptic } from './src/utils/haptics';
import { RemoteButton } from './src/components/RemoteButton';
import { DPadAndTouchpad } from './src/components/DPadAndTouchpad';
import { KeypadTab } from './src/components/KeypadTab';
import { MediaAndToolsTab } from './src/components/MediaAndToolsTab';
import { SettingsModal } from './src/components/SettingsModal';

const ACCENT_PALETTE = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
];

function RemoteControllerScreen() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [devices, setDevices] = useState<TvDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteChannel[]>(
    DEFAULT_FAVORITE_CHANNELS
  );
  const [settings, setSettings] = useState<AppSettings>({
    hapticsEnabled: true,
    navigationMode: 'dpad',
    demoMode: Platform.OS === 'web',
  });

  const [activeTab, setActiveTab] = useState<RemoteTab>('remote');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tvOnline, setTvOnline] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<CommandFeedback | null>(null);
  const [isChannelSending, setIsChannelSending] = useState(false);

  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeDevice = useMemo(
    () => devices.find((d) => d.id === activeDeviceId) ?? null,
    [devices, activeDeviceId]
  );

  const showFeedback = useCallback(
    (
      label: string,
      status: CommandFeedback['status'],
      detail?: string,
      durationMs = 1900
    ) => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
      setFeedback({
        id: Date.now(),
        label,
        detail,
        status,
      });
      feedbackTimerRef.current = setTimeout(() => {
        setFeedback(null);
      }, durationMs);
    },
    []
  );

  // İlk açılışta kayıtlı verileri yükle (main.py checkConfig karşılığı)
  useEffect(() => {
    let mounted = true;
    loadPersistedState().then((state) => {
      if (!mounted) {
        return;
      }
      setDevices(state.devices);
      setActiveDeviceId(state.activeDeviceId);
      setFavorites(state.favorites);
      setSettings(state.settings);
      setIsHydrated(true);

      if (state.devices.length === 0 && !state.settings.demoMode) {
        setSettingsVisible(true);
      }
    });

    return () => {
      mounted = false;
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  // Seçili TV erişilebilirlik kontrolü
  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (!activeDevice || settings.demoMode) {
      setTvOnline(null);
      return;
    }

    let cancelled = false;
    checkTvAccessible(
      activeDevice.ip,
      activeDevice.discoveryPort,
      activeDevice.remotePort,
      2000
    ).then((res) => {
      if (!cancelled) {
        setTvOnline(res.accessible);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeDevice, isHydrated, settings.demoMode]);

  const handleUpdateSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    saveAppSettings(next);
  }, []);

  const handleUpsertDevice = useCallback(
    (device: TvDevice) => {
      setDevices((prev) => {
        const exists = prev.some((d) => d.id === device.id || d.ip === device.ip);
        const updated = exists
          ? prev.map((d) =>
              d.id === device.id || d.ip === device.ip ? device : d
            )
          : [device, ...prev];
        saveDevicesState(updated, device.id);
        return updated;
      });
      setActiveDeviceId(device.id);
      setTvOnline(true);
    },
    []
  );

  const handleSelectDevice = useCallback(
    (id: string) => {
      setActiveDeviceId(id);
      saveDevicesState(devices, id);
    },
    [devices]
  );

  const handleDeleteDevice = useCallback(
    (id: string) => {
      setDevices((prev) => {
        const remaining = prev.filter((d) => d.id !== id);
        const nextActive =
          activeDeviceId === id ? remaining[0]?.id ?? null : activeDeviceId;
        setActiveDeviceId(nextActive);
        saveDevicesState(remaining, nextActive);
        return remaining;
      });
    },
    [activeDeviceId]
  );

  const handleSendKey = useCallback(
    async (
      code: VestelKeyCode,
      label: string,
      haptic: HapticStrength = 'light'
    ) => {
      triggerHaptic(settings.hapticsEnabled, haptic);

      if (!activeDevice && !settings.demoMode) {
        showFeedback('Önce TV IP adresi ekleyin', 'error');
        setSettingsVisible(true);
        return;
      }

      const res = await sendKeyCode(activeDevice, code, settings.demoMode);
      if (res.ok) {
        if (!res.demo) {
          setTvOnline(true);
        }
        showFeedback(
          label,
          res.demo ? 'demo' : 'ok',
          res.demo ? `Kod ${code} (Test)` : `Kod ${code}`
        );
      } else {
        setTvOnline(false);
        triggerHaptic(settings.hapticsEnabled, 'warning');
        showFeedback('TV yanıt vermedi', 'error', activeDevice?.ip);
      }
    },
    [activeDevice, settings.demoMode, settings.hapticsEnabled, showFeedback]
  );

  const handleLaunchApp = useCallback(
    async (appName: string) => {
      triggerHaptic(settings.hapticsEnabled, 'medium');

      if (!activeDevice && !settings.demoMode) {
        showFeedback('Önce TV IP adresi ekleyin', 'error');
        setSettingsVisible(true);
        return;
      }

      showFeedback(`${appName} açılıyor...`, 'sending');
      const res = await launchApplication(
        activeDevice,
        appName,
        settings.demoMode
      );
      if (res.ok) {
        if (!res.demo) {
          setTvOnline(true);
        }
        showFeedback(
          `${appName} başlatıldı`,
          res.demo ? 'demo' : 'ok'
        );
      } else {
        setTvOnline(false);
        triggerHaptic(settings.hapticsEnabled, 'warning');
        showFeedback(`${appName} açılamadı`, 'error', activeDevice?.ip);
      }
    },
    [activeDevice, settings.demoMode, settings.hapticsEnabled, showFeedback]
  );

  const handleGoToChannel = useCallback(
    async (channelNumber: string) => {
      triggerHaptic(settings.hapticsEnabled, 'medium');

      if (!activeDevice && !settings.demoMode) {
        showFeedback('Önce TV IP adresi ekleyin', 'error');
        setSettingsVisible(true);
        return;
      }

      setIsChannelSending(true);
      showFeedback(`Kanal ${channelNumber} gönderiliyor...`, 'sending');
      try {
        const res = await goToChannelSequence(
          activeDevice,
          channelNumber,
          settings.demoMode
        );
        if (res.ok) {
          showFeedback(
            `Kanal ${channelNumber}`,
            res.demo ? 'demo' : 'ok',
            'OK gönderildi'
          );
        } else {
          setTvOnline(false);
          showFeedback('Kanal değiştirilemedi', 'error');
        }
      } finally {
        setIsChannelSending(false);
      }
    },
    [activeDevice, settings.demoMode, settings.hapticsEnabled, showFeedback]
  );

  const handleBatchVolume = useCallback(
    async (
      steps: number,
      direction: 'up' | 'down',
      signal: AbortSignal,
      onProgress: (curr: number, total: number) => void
    ) => {
      triggerHaptic(settings.hapticsEnabled, 'medium');

      if (!activeDevice && !settings.demoMode) {
        showFeedback('Önce TV IP adresi ekleyin', 'error');
        setSettingsVisible(true);
        return;
      }

      const dirLabel = direction === 'up' ? '+' : '-';
      const res = await changeVolumeBatch(
        activeDevice,
        steps,
        direction,
        settings.demoMode,
        (curr, total) => {
          onProgress(curr, total);
          showFeedback(`Ses ${dirLabel}${curr}/${total}`, 'sending');
        },
        signal
      );

      if (res.ok) {
        showFeedback(
          `Ses ${dirLabel}${res.completedSteps} uygulandı`,
          res.demo ? 'demo' : 'ok'
        );
      } else {
        setTvOnline(false);
        showFeedback('Ses komutu başarısız', 'error');
      }
    },
    [activeDevice, settings.demoMode, settings.hapticsEnabled, showFeedback]
  );

  const handleAddFavorite = useCallback(
    (name: string, number: number) => {
      triggerHaptic(settings.hapticsEnabled, 'success');
      setFavorites((prev) => {
        const next: FavoriteChannel[] = [
          ...prev,
          {
            id: `fav-${Date.now()}`,
            name,
            number,
            accent: ACCENT_PALETTE[prev.length % ACCENT_PALETTE.length],
          },
        ];
        saveFavoriteChannels(next);
        return next;
      });
    },
    [settings.hapticsEnabled]
  );

  const handleRemoveFavorite = useCallback(
    (id: string) => {
      triggerHaptic(settings.hapticsEnabled, 'light');
      setFavorites((prev) => {
        const next = prev.filter((f) => f.id !== id);
        saveFavoriteChannels(next);
        return next;
      });
    },
    [settings.hapticsEnabled]
  );

  const connectionDotColor = settings.demoMode
    ? '#F59E0B'
    : !activeDevice
    ? '#EF4444'
    : tvOnline === true
    ? '#10B981'
    : tvOnline === false
    ? '#EF4444'
    : '#60A5FA';

  const connectionLabel = settings.demoMode
    ? activeDevice
      ? `${activeDevice.name} (Test Modu)`
      : 'Simülasyon Modu • TV Ekle'
    : activeDevice
    ? activeDevice.name
    : 'TV Bağlı Değil • Dokun ve Ekle';

  const connectionSubtext = settings.demoMode
    ? 'Gerçek TV kontrolü için Ayarlar → Test Modunu kapatın'
    : activeDevice
    ? `${activeDevice.ip}:${activeDevice.remotePort}`
    : 'Aynı Wi-Fi üzerindeki Vestel TV IP adresini girin';

  return (
    <LinearGradient
      colors={['#090B10', '#0F131D', '#090B10']}
      style={styles.screenBg}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.remoteChassis}>
          {/* Üst Bağlantı ve IR Durum Çubuğu */}
          <View style={styles.headerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="TV bağlantı ayarlarını aç"
              onPress={() => setSettingsVisible(true)}
              style={({ pressed }) => [
                styles.tvSelectorPill,
                pressed && styles.tvSelectorPressed,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: connectionDotColor },
                ]}
              />
              <View style={styles.tvSelectorTexts}>
                <Text numberOfLines={1} style={styles.tvNameText}>
                  {connectionLabel}
                </Text>
                <Text numberOfLines={1} style={styles.tvIpText}>
                  {connectionSubtext}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={15} color="#94A3B8" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ayarlar"
              onPress={() => setSettingsVisible(true)}
              style={({ pressed }) => [
                styles.settingsIconBtn,
                pressed && styles.tvSelectorPressed,
              ]}
            >
              <Ionicons name="settings-outline" size={20} color="#E2E8F0" />
            </Pressable>
          </View>

          {/* Canlı Komut Geri Bildirim Şeridi */}
          <View style={styles.feedbackBarWrap}>
            {feedback ? (
              <View
                style={[
                  styles.feedbackPill,
                  feedback.status === 'error' && styles.feedbackError,
                  feedback.status === 'demo' && styles.feedbackDemo,
                ]}
              >
                <View
                  style={[
                    styles.irPulseDot,
                    feedback.status === 'error'
                      ? { backgroundColor: '#F87171' }
                      : feedback.status === 'demo'
                      ? { backgroundColor: '#FBBF24' }
                      : { backgroundColor: '#34D399' },
                  ]}
                />
                <Text numberOfLines={1} style={styles.feedbackText}>
                  {feedback.label}
                  {feedback.detail ? ` • ${feedback.detail}` : ''}
                </Text>
              </View>
            ) : (
              <View style={styles.brandSubtleRow}>
                <Text style={styles.brandText}>VESTEL SMART REMOTE</Text>
              </View>
            )}
          </View>

          {/* Her Sekmede Sabit Üst Donanım Tuşları */}
          <View style={styles.topHardwareRow}>
            <RemoteButton
              accessibilityLabel="Güç Aç Kapat"
              label="Güç"
              variant="power"
              icon={<Ionicons name="power" size={20} color="#F87171" />}
              onPress={() =>
                handleSendKey(VESTEL_KEYS.POWER, 'Güç Aç/Kapat', 'heavy')
              }
              style={styles.topHwBtn}
            />
            <RemoteButton
              accessibilityLabel="Kaynak Seçimi"
              label="Kaynak"
              icon={<MaterialCommunityIcons name="import" size={20} color="#E2E8F0" />}
              onPress={() =>
                handleSendKey(VESTEL_KEYS.SOURCE, 'Kaynak (Source)', 'medium')
              }
              style={styles.topHwBtn}
            />
            <RemoteButton
              accessibilityLabel="Sessize Al"
              label="Sessiz"
              icon={<Ionicons name="volume-mute-outline" size={20} color="#FCA5A5" />}
              onPress={() =>
                handleSendKey(VESTEL_KEYS.MUTE, 'Sessiz (Mute)', 'medium')
              }
              style={styles.topHwBtn}
            />
            <RemoteButton
              accessibilityLabel="Hızlı Menü Q.Menu"
              label="Q.Menu"
              icon={<Ionicons name="options-outline" size={19} color="#93C5FD" />}
              onPress={() =>
                handleSendKey(VESTEL_KEYS.Q_MENU, 'Q.Menu', 'light')
              }
              style={styles.topHwBtn}
            />
          </View>

          {/* Sekme İçeriği */}
          <View style={styles.tabBody}>
            {activeTab === 'remote' ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.mainRemoteScroll}
              >
                {/* Orta Konsol: Ses Rocker + D-Pad/Touchpad + Kanal Rocker */}
                <View style={styles.centerConsoleRow}>
                  {/* Sol: Ses + / - */}
                  <View style={styles.rockerColumn}>
                    <View style={styles.rockerHousing}>
                      <RemoteButton
                        accessibilityLabel="Ses Artır"
                        variant="elevated"
                        repeatable
                        icon={<Ionicons name="add" size={24} color="#F8FAFC" />}
                        onPress={() =>
                          handleSendKey(VESTEL_KEYS.VOL_UP, 'Ses +', 'medium')
                        }
                        style={styles.rockerTopBtn}
                      />
                      <View style={styles.rockerCenterLabelWrap}>
                        <Ionicons
                          name="volume-medium-outline"
                          size={15}
                          color="#94A3B8"
                        />
                        <Text style={styles.rockerLabel}>SES</Text>
                      </View>
                      <RemoteButton
                        accessibilityLabel="Ses Azalt"
                        variant="elevated"
                        repeatable
                        icon={<Ionicons name="remove" size={24} color="#F8FAFC" />}
                        onPress={() =>
                          handleSendKey(VESTEL_KEYS.VOL_DOWN, 'Ses -', 'medium')
                        }
                        style={styles.rockerBottomBtn}
                      />
                    </View>
                  </View>

                  {/* Orta: D-Pad veya Dokunmatik Yüzey */}
                  <DPadAndTouchpad
                    mode={settings.navigationMode}
                    onToggleMode={() => {
                      triggerHaptic(settings.hapticsEnabled, 'light');
                      handleUpdateSettings({
                        ...settings,
                        navigationMode:
                          settings.navigationMode === 'dpad'
                            ? 'touchpad'
                            : 'dpad',
                      });
                    }}
                    onUp={() =>
                      handleSendKey(VESTEL_KEYS.UP, 'Yukarı ▲', 'light')
                    }
                    onDown={() =>
                      handleSendKey(VESTEL_KEYS.DOWN, 'Aşağı ▼', 'light')
                    }
                    onLeft={() =>
                      handleSendKey(VESTEL_KEYS.LEFT, 'Sol ◀', 'light')
                    }
                    onRight={() =>
                      handleSendKey(VESTEL_KEYS.RIGHT, 'Sağ ▶', 'light')
                    }
                    onOk={() => handleSendKey(VESTEL_KEYS.OK, 'OK', 'medium')}
                  />

                  {/* Sağ: Kanal + / - */}
                  <View style={styles.rockerColumn}>
                    <View style={styles.rockerHousing}>
                      <RemoteButton
                        accessibilityLabel="Sonraki Kanal"
                        variant="elevated"
                        repeatable
                        icon={
                          <Ionicons name="chevron-up" size={24} color="#F8FAFC" />
                        }
                        onPress={() =>
                          handleSendKey(VESTEL_KEYS.CH_UP, 'Kanal +', 'medium')
                        }
                        style={styles.rockerTopBtn}
                      />
                      <View style={styles.rockerCenterLabelWrap}>
                        <Text style={styles.rockerLabel}>KANAL</Text>
                      </View>
                      <RemoteButton
                        accessibilityLabel="Önceki Kanal"
                        variant="elevated"
                        repeatable
                        icon={
                          <Ionicons
                            name="chevron-down"
                            size={24}
                            color="#F8FAFC"
                          />
                        }
                        onPress={() =>
                          handleSendKey(VESTEL_KEYS.CH_DOWN, 'Kanal -', 'medium')
                        }
                        style={styles.rockerBottomBtn}
                      />
                    </View>
                  </View>
                </View>

                {/* Navigasyon Tuşları: Geri, Menü, Bilgi, Çıkış */}
                <View style={styles.navButtonsRow}>
                  <RemoteButton
                    label="Geri"
                    icon={
                      <Ionicons
                        name="arrow-undo-outline"
                        size={18}
                        color="#E2E8F0"
                      />
                    }
                    onPress={() =>
                      handleSendKey(VESTEL_KEYS.BACK, 'Geri (Back)')
                    }
                    style={styles.navBtn}
                  />
                  <RemoteButton
                    label="Menü"
                    variant="elevated"
                    icon={
                      <Ionicons name="home-outline" size={18} color="#93C5FD" />
                    }
                    onPress={() =>
                      handleSendKey(VESTEL_KEYS.MENU, 'Ana Menü', 'medium')
                    }
                    style={styles.navBtn}
                  />
                  <RemoteButton
                    label="Bilgi"
                    icon={
                      <Ionicons
                        name="information-circle-outline"
                        size={19}
                        color="#E2E8F0"
                      />
                    }
                    onPress={() =>
                      handleSendKey(VESTEL_KEYS.INFO, 'Kanal Bilgisi')
                    }
                    style={styles.navBtn}
                  />
                  <RemoteButton
                    label="Çıkış"
                    icon={
                      <Ionicons
                        name="close-circle-outline"
                        size={19}
                        color="#E2E8F0"
                      />
                    }
                    onPress={() =>
                      handleSendKey(VESTEL_KEYS.EXIT, 'Çıkış (Exit)')
                    }
                    style={styles.navBtn}
                  />
                </View>

                {/* Renkli Fonksiyon Tuşları (Kırmızı, Sarı, Mavi, Yeşil) */}
                <View style={styles.colorRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Kırmızı Tuş"
                    onPress={() =>
                      handleSendKey(VESTEL_KEYS.RED, 'Kırmızı Tuş')
                    }
                    style={({ pressed }) => [
                      styles.colorPill,
                      { backgroundColor: '#DC2626' },
                      pressed && styles.colorPillPressed,
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sarı Tuş"
                    onPress={() =>
                      handleSendKey(VESTEL_KEYS.YELLOW, 'Sarı Tuş')
                    }
                    style={({ pressed }) => [
                      styles.colorPill,
                      { backgroundColor: '#EAB308' },
                      pressed && styles.colorPillPressed,
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Mavi Tuş"
                    onPress={() =>
                      handleSendKey(VESTEL_KEYS.BLUE, 'Mavi Tuş')
                    }
                    style={({ pressed }) => [
                      styles.colorPill,
                      { backgroundColor: '#2563EB' },
                      pressed && styles.colorPillPressed,
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Yeşil Tuş"
                    onPress={() =>
                      handleSendKey(VESTEL_KEYS.GREEN, 'Yeşil Tuş')
                    }
                    style={({ pressed }) => [
                      styles.colorPill,
                      { backgroundColor: '#16A34A' },
                      pressed && styles.colorPillPressed,
                    ]}
                  />
                </View>

                {/* Hızlı Uygulamalar ve Kısayollar */}
                <View style={styles.quickAppsRow}>
                  <RemoteButton
                    label="NETFLIX"
                    variant="netflix"
                    onPress={() => handleLaunchApp('Netflix')}
                    style={styles.appBtn}
                  />
                  <RemoteButton
                    label="YouTube"
                    variant="youtube"
                    icon={
                      <Ionicons name="logo-youtube" size={16} color="#FF0033" />
                    }
                    onPress={() => handleLaunchApp('YouTube')}
                    style={styles.appBtn}
                  />
                  <RemoteButton
                    label="Rehber"
                    icon={
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#CBD5E1"
                      />
                    }
                    onPress={() =>
                      handleSendKey(VESTEL_KEYS.EPG, 'EPG Rehber')
                    }
                    style={styles.appSmallBtn}
                  />
                  <RemoteButton
                    label="Önceki"
                    icon={
                      <MaterialCommunityIcons
                        name="swap-horizontal"
                        size={17}
                        color="#CBD5E1"
                      />
                    }
                    onPress={() =>
                      handleSendKey(VESTEL_KEYS.SWAP, 'Önceki Kanal')
                    }
                    style={styles.appSmallBtn}
                  />
                </View>
              </ScrollView>
            ) : activeTab === 'keypad' ? (
              <KeypadTab
                onSendKey={handleSendKey}
                onGoToChannel={handleGoToChannel}
                favorites={favorites}
                onAddFavorite={handleAddFavorite}
                onRemoveFavorite={handleRemoveFavorite}
                isChannelSending={isChannelSending}
              />
            ) : (
              <MediaAndToolsTab
                onSendKey={handleSendKey}
                onLaunchApp={handleLaunchApp}
                onBatchVolume={handleBatchVolume}
              />
            )}
          </View>

          {/* Alt Sekme Geçiş Çubuğu */}
          <View style={styles.bottomTabBar}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'remote' }}
              onPress={() => {
                triggerHaptic(settings.hapticsEnabled, 'light');
                setActiveTab('remote');
              }}
              style={[
                styles.tabItem,
                activeTab === 'remote' && styles.tabItemActive,
              ]}
            >
              <MaterialCommunityIcons
                name="remote-tv"
                size={19}
                color={activeTab === 'remote' ? '#60A5FA' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'remote' && styles.tabTextActive,
                ]}
              >
                Kumanda
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'keypad' }}
              onPress={() => {
                triggerHaptic(settings.hapticsEnabled, 'light');
                setActiveTab('keypad');
              }}
              style={[
                styles.tabItem,
                activeTab === 'keypad' && styles.tabItemActive,
              ]}
            >
              <Ionicons
                name="keypad-outline"
                size={18}
                color={activeTab === 'keypad' ? '#60A5FA' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'keypad' && styles.tabTextActive,
                ]}
              >
                123 & Kanal
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'media' }}
              onPress={() => {
                triggerHaptic(settings.hapticsEnabled, 'light');
                setActiveTab('media');
              }}
              style={[
                styles.tabItem,
                activeTab === 'media' && styles.tabItemActive,
              ]}
            >
              <Ionicons
                name="play-forward-circle-outline"
                size={19}
                color={activeTab === 'media' ? '#60A5FA' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'media' && styles.tabTextActive,
                ]}
              >
                Medya & Ekstra
              </Text>
            </Pressable>
          </View>
        </View>

        <SettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          devices={devices}
          activeDeviceId={activeDeviceId}
          onSelectDevice={handleSelectDevice}
          onUpsertDevice={handleUpsertDevice}
          onDeleteDevice={handleDeleteDevice}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RemoteControllerScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  remoteChassis: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tvSelectorPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#151A25',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tvSelectorPressed: {
    opacity: 0.78,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  tvSelectorTexts: {
    flex: 1,
  },
  tvNameText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  tvIpText: {
    color: '#94A3B8',
    fontSize: 10.5,
    marginTop: 1,
  },
  settingsIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#151A25',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  feedbackBarWrap: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
  },
  feedbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#132620',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
  },
  feedbackError: {
    backgroundColor: '#311419',
    borderColor: 'rgba(248,113,113,0.4)',
  },
  feedbackDemo: {
    backgroundColor: '#2B2110',
    borderColor: 'rgba(251,191,36,0.4)',
  },
  irPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  feedbackText: {
    color: '#F1F5F9',
    fontSize: 11.5,
    fontWeight: '600',
  },
  brandSubtleRow: {
    alignItems: 'center',
  },
  brandText: {
    color: '#475569',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 2.2,
  },
  topHardwareRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 12,
  },
  topHwBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
  },
  tabBody: {
    flex: 1,
  },
  mainRemoteScroll: {
    flexGrow: 1,
    justifyContent: 'space-evenly',
    gap: 12,
    paddingBottom: 6,
  },
  centerConsoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rockerColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rockerHousing: {
    width: 66,
    height: 186,
    borderRadius: 28,
    backgroundColor: '#141822',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 5,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rockerTopBtn: {
    width: '100%',
    height: 64,
    borderRadius: 22,
  },
  rockerBottomBtn: {
    width: '100%',
    height: 64,
    borderRadius: 22,
  },
  rockerCenterLabelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  rockerLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  navButtonsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  navBtn: {
    flex: 1,
    minHeight: 54,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  colorPill: {
    flex: 1,
    height: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.35)',
    borderBottomColor: 'rgba(0,0,0,0.45)',
  },
  colorPillPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.85,
  },
  quickAppsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  appBtn: {
    flex: 1.15,
    minHeight: 50,
  },
  appSmallBtn: {
    flex: 0.95,
    minHeight: 50,
  },
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#131722',
    borderRadius: 20,
    padding: 4,
    gap: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 16,
  },
  tabItemActive: {
    backgroundColor: '#1E2738',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
});
