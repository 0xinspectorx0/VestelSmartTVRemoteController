import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppSettings, PORT_PROFILES, TvDevice } from '../types/tv';
import {
  checkTvAccessible,
  detectLocalSubnetPrefix,
  isValidIPv4,
  isValidSubnetPrefix,
  scanSubnetForVestelTvs,
} from '../services/vestelApi';
import { RemoteButton } from './RemoteButton';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  devices: TvDevice[];
  activeDeviceId: string | null;
  onSelectDevice: (id: string) => void;
  onUpsertDevice: (device: TvDevice) => void;
  onDeleteDevice: (id: string) => void;
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  devices,
  activeDeviceId,
  onSelectDevice,
  onUpsertDevice,
  onDeleteDevice,
  settings,
  onUpdateSettings,
}) => {
  const activeDevice = devices.find((d) => d.id === activeDeviceId) ?? null;

  const [ipInput, setIpInput] = useState(activeDevice?.ip ?? '');
  const [nameInput, setNameInput] = useState(activeDevice?.name ?? '');
  const [selectedProfileId, setSelectedProfileId] = useState<'classic' | 'modern'>(
    activeDevice?.remotePort === 56789 ? 'modern' : 'classic'
  );
  const [statusMessage, setStatusMessage] = useState<{
    type: 'info' | 'success' | 'error';
    text: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Otomatik ağ tarama durumu
  const [subnetPrefix, setSubnetPrefix] = useState('192.168.1');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [discoveredTvs, setDiscoveredTvs] = useState<TvDevice[]>([]);
  const scanAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (visible) {
      setStatusMessage(null);
      if (activeDevice) {
        setIpInput(activeDevice.ip);
        setNameInput(activeDevice.name);
        setSelectedProfileId(activeDevice.remotePort === 56789 ? 'modern' : 'classic');
      }
      detectLocalSubnetPrefix().then((prefix) => {
        setSubnetPrefix(prefix);
      });
    } else {
      scanAbortRef.current?.abort();
      setIsScanning(false);
    }
  }, [visible, activeDevice]);

  const currentPortProfile =
    PORT_PROFILES.find((p) => p.id === selectedProfileId) ?? PORT_PROFILES[0];

  const handleTestAndSave = async () => {
    const cleanIp = ipInput.trim();
    if (!isValidIPv4(cleanIp)) {
      setStatusMessage({
        type: 'error',
        text: 'Geçerli bir IPv4 adresi girin (örn: 192.168.1.45).',
      });
      return;
    }

    setIsTesting(true);
    setStatusMessage({
      type: 'info',
      text: `${cleanIp} adresindeki Vestel TV kontrol ediliyor...`,
    });

    const result = await checkTvAccessible(
      cleanIp,
      currentPortProfile.discoveryPort,
      currentPortProfile.remotePort,
      2400
    );
    setIsTesting(false);

    if (result.accessible) {
      const device: TvDevice = {
        id: `tv-${cleanIp.replace(/\./g, '-')}`,
        ip: cleanIp,
        name:
          nameInput.trim() ||
          result.friendlyName ||
          result.modelName ||
          `Vestel TV (${cleanIp})`,
        remotePort: result.detectedRemotePort ?? currentPortProfile.remotePort,
        discoveryPort: result.detectedDiscoveryPort ?? currentPortProfile.discoveryPort,
        modelName: result.modelName,
        lastConnectedAt: Date.now(),
      };
      onUpsertDevice(device);
      if (settings.demoMode && Platform.OS !== 'web') {
        onUpdateSettings({ ...settings, demoMode: false });
      }
      setStatusMessage({
        type: 'success',
        text: `Bağlantı başarılı! "${device.name}" kaydedildi.`,
      });
    } else {
      setStatusMessage({
        type: 'error',
        text:
          'TV şu an yanıt vermedi. TV açık mı ve aynı Wi-Fi ağında mısınız? İsterseniz "Doğrudan Kaydet" ile yine de kaydedebilirsiniz.',
      });
    }
  };

  const handleForceSave = () => {
    const cleanIp = ipInput.trim();
    if (!isValidIPv4(cleanIp)) {
      setStatusMessage({
        type: 'error',
        text: 'Geçerli bir IPv4 adresi girin (örn: 192.168.1.45).',
      });
      return;
    }

    const device: TvDevice = {
      id: `tv-${cleanIp.replace(/\./g, '-')}`,
      ip: cleanIp,
      name: nameInput.trim() || `Vestel TV (${cleanIp})`,
      remotePort: currentPortProfile.remotePort,
      discoveryPort: currentPortProfile.discoveryPort,
    };
    onUpsertDevice(device);
    if (settings.demoMode && Platform.OS !== 'web') {
      onUpdateSettings({ ...settings, demoMode: false });
    }
    setStatusMessage({
      type: 'success',
      text: `${device.name} (${cleanIp}) kaydedildi.`,
    });
  };

  const handleStartScan = async () => {
    const cleanPrefix = subnetPrefix.trim().replace(/\.$/, '');
    if (!isValidSubnetPrefix(cleanPrefix)) {
      setStatusMessage({
        type: 'error',
        text: 'Alt ağ ilk 3 haneden oluşmalıdır (örn: 192.168.1).',
      });
      return;
    }

    scanAbortRef.current?.abort();
    const controller = new AbortController();
    scanAbortRef.current = controller;
    setDiscoveredTvs([]);
    setScanProgress(0);
    setIsScanning(true);
    setStatusMessage(null);

    try {
      const results = await scanSubnetForVestelTvs(
        cleanPrefix,
        (pct) => setScanProgress(pct),
        (foundTv) => {
          setDiscoveredTvs((prev) =>
            prev.some((d) => d.ip === foundTv.ip) ? prev : [...prev, foundTv]
          );
        },
        controller.signal
      );

      if (!controller.signal.aborted && results.length === 0) {
        setStatusMessage({
          type: 'info',
          text: `${cleanPrefix}.1-254 aralığında yanıt veren TV bulunamadı. TV'nin açık olduğundan emin olun veya IP adresini elle girin.`,
        });
      }
    } finally {
      setIsScanning(false);
      scanAbortRef.current = null;
    }
  };

  const handleStopScan = () => {
    scanAbortRef.current?.abort();
    setIsScanning(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>TV Bağlantısı ve Ayarlar</Text>
              <Text style={styles.sheetSubtitle}>
                Yerel Wi-Fi üzerinden doğrudan iPhone kontrolü
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              onPress={onClose}
              style={styles.closeIconBtn}
            >
              <Ionicons name="close" size={20} color="#E2E8F0" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* Durum bildirimi */}
            {statusMessage ? (
              <View
                style={[
                  styles.alertBox,
                  statusMessage.type === 'success' && styles.alertSuccess,
                  statusMessage.type === 'error' && styles.alertError,
                ]}
              >
                <Ionicons
                  name={
                    statusMessage.type === 'success'
                      ? 'checkmark-circle'
                      : statusMessage.type === 'error'
                      ? 'warning'
                      : 'information-circle'
                  }
                  size={18}
                  color={
                    statusMessage.type === 'success'
                      ? '#34D399'
                      : statusMessage.type === 'error'
                      ? '#F87171'
                      : '#60A5FA'
                  }
                />
                <Text style={styles.alertText}>{statusMessage.text}</Text>
              </View>
            ) : null}

            {/* Kayıtlı TV Cihazları */}
            {devices.length > 0 ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Kayıtlı Televizyonlar</Text>
                {devices.map((dev) => {
                  const isSelected = dev.id === activeDeviceId;
                  return (
                    <Pressable
                      key={dev.id}
                      onPress={() => {
                        onSelectDevice(dev.id);
                        setIpInput(dev.ip);
                        setNameInput(dev.name);
                      }}
                      style={[
                        styles.deviceRow,
                        isSelected && styles.deviceRowSelected,
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? '#3B82F6' : '#64748B'}
                      />
                      <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>{dev.name}</Text>
                        <Text style={styles.deviceMeta}>
                          {dev.ip}:{dev.remotePort}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityLabel={`${dev.name} sil`}
                        onPress={() => onDeleteDevice(dev.id)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#F87171" />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* Manuel TV IP Girişi */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>TV IP Adresi Ekle / Güncelle</Text>
              <Text style={styles.helperText}>
                TV kumandasından Menü → Ayarlar → Ağ Ayarları ekranından IP adresini görebilirsiniz.
              </Text>

              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="TV Adı (isteğe bağlı, örn: Salon TV)"
                placeholderTextColor="#64748B"
                style={styles.input}
              />

              <TextInput
                value={ipInput}
                onChangeText={setIpInput}
                placeholder="TV IP Adresi (örn: 192.168.1.50)"
                placeholderTextColor="#64748B"
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />

              {/* Port Profili */}
              <View style={styles.profileRow}>
                {PORT_PROFILES.map((prof) => {
                  const selected = prof.id === selectedProfileId;
                  return (
                    <Pressable
                      key={prof.id}
                      onPress={() => setSelectedProfileId(prof.id)}
                      style={[
                        styles.profileOption,
                        selected && styles.profileOptionSelected,
                      ]}
                    >
                      <Text style={styles.profileTitle}>{prof.label}</Text>
                      <Text style={styles.profileDesc}>{prof.description}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.actionButtonsRow}>
                <RemoteButton
                  label={isTesting ? 'Test Ediliyor...' : 'Test Et ve Kaydet'}
                  variant="primary"
                  disabled={isTesting}
                  onPress={handleTestAndSave}
                  style={styles.savePrimaryBtn}
                />
                <RemoteButton
                  label="Doğrudan Kaydet"
                  variant="subtle"
                  disabled={isTesting}
                  onPress={handleForceSave}
                  style={styles.saveSecondaryBtn}
                />
              </View>
            </View>

            {/* Wi-Fi Ağında Otomatik TV Arama */}
            <View style={styles.sectionCard}>
              <View style={styles.scanHeaderRow}>
                <MaterialCommunityIcons name="radar" size={18} color="#34D399" />
                <Text style={styles.sectionTitle}>Wi-Fi Ağında Otomatik TV Bul</Text>
              </View>
              <Text style={styles.helperText}>
                Yerel ağınızdaki açık Vestel Smart TV cihazlarını otomatik tarar.
              </Text>

              <View style={styles.scanInputRow}>
                <TextInput
                  value={subnetPrefix}
                  onChangeText={setSubnetPrefix}
                  placeholder="192.168.1"
                  placeholderTextColor="#64748B"
                  keyboardType={
                    Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'
                  }
                  style={[styles.input, styles.subnetInput]}
                />
                <Text style={styles.subnetSuffix}>.1 - 254</Text>
                {isScanning ? (
                  <RemoteButton
                    label={`Durdur (%${scanProgress})`}
                    variant="power"
                    onPress={handleStopScan}
                    style={styles.scanBtn}
                  />
                ) : (
                  <RemoteButton
                    label="Ağı Tara"
                    variant="elevated"
                    onPress={handleStartScan}
                    style={styles.scanBtn}
                  />
                )}
              </View>

              {isScanning ? (
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${scanProgress}%` }]}
                  />
                </View>
              ) : null}

              {discoveredTvs.map((tv) => (
                <View key={tv.id} style={styles.discoveredItem}>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{tv.name}</Text>
                    <Text style={styles.deviceMeta}>
                      {tv.ip}:{tv.remotePort}
                    </Text>
                  </View>
                  <RemoteButton
                    label="Bağlan"
                    variant="primary"
                    onPress={() => {
                      onUpsertDevice(tv);
                      if (settings.demoMode && Platform.OS !== 'web') {
                        onUpdateSettings({ ...settings, demoMode: false });
                      }
                      onClose();
                    }}
                    style={styles.connectSmallBtn}
                  />
                </View>
              ))}

              {isScanning ? (
                <View style={styles.scanningIndicatorRow}>
                  <ActivityIndicator size="small" color="#60A5FA" />
                  <Text style={styles.scanningText}>
                    Ağ taranıyor... (%{scanProgress})
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Uygulama Tercihleri */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Kumanda Tercihleri</Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleLabel}>Dokunsal Titreşim (Haptic)</Text>
                  <Text style={styles.helperText}>
                    iPhone tuş basımlarında titreşim geri bildirimi
                  </Text>
                </View>
                <Switch
                  value={settings.hapticsEnabled}
                  onValueChange={(val) =>
                    onUpdateSettings({ ...settings, hapticsEnabled: val })
                  }
                  trackColor={{ false: '#334155', true: '#2563EB' }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleLabel}>Simülasyon / Test Modu</Text>
                  <Text style={styles.helperText}>
                    TV bağlı değilken arayüzü denemek için açın; gerçek TV kontrolü için kapatın
                  </Text>
                </View>
                <Switch
                  value={settings.demoMode}
                  onValueChange={(val) =>
                    onUpdateSettings({ ...settings, demoMode: val })
                  }
                  trackColor={{ false: '#334155', true: '#F59E0B' }}
                />
              </View>
            </View>

            {/* iOS Kurulum ve İzin Rehberi */}
            <View style={styles.tipsCard}>
              <View style={styles.scanHeaderRow}>
                <Ionicons name="phone-portrait-outline" size={16} color="#93C5FD" />
                <Text style={styles.sectionTitle}>iOS Bağlantı Kontrol Listesi</Text>
              </View>
              <Text style={styles.tipItem}>
                1. iPhone ve Vestel Smart TV aynı ev Wi-Fi ağına bağlı olmalıdır.
              </Text>
              <Text style={styles.tipItem}>
                2. İlk tuş basımında iOS &quot;Yerel ağdaki aygıtları bulmak istiyor&quot; izni sorarsa &quot;İzin Ver&quot; seçeneğine dokunun (veya iPhone Ayarlar → Gizlilik ve Güvenlik → Yerel Ağ altından açın).
              </Text>
              <Text style={styles.tipItem}>
                3. Vestel TV menüsünden Ayarlar → Ağ → Sanal Kumanda (Virtual Remote) ayarının &quot;Etkin&quot; olduğundan emin olun.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 6, 12, 0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: '#0F131C',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  handleBar: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2534',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    gap: 14,
    paddingBottom: 16,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#172554',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.35)',
  },
  alertSuccess: {
    backgroundColor: '#062E22',
    borderColor: 'rgba(52,211,153,0.4)',
  },
  alertError: {
    backgroundColor: '#351318',
    borderColor: 'rgba(248,113,113,0.4)',
  },
  alertText: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 12,
    lineHeight: 17,
  },
  sectionCard: {
    backgroundColor: '#161B26',
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: {
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 16,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#0F131C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  deviceRowSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#131D33',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
  },
  deviceMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 6,
  },
  input: {
    height: 44,
    backgroundColor: '#0B0E15',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.22)',
  },
  profileRow: {
    flexDirection: 'row',
    gap: 8,
  },
  profileOption: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#0F131C',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 3,
  },
  profileOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#131F38',
  },
  profileTitle: {
    color: '#E2E8F0',
    fontSize: 11.5,
    fontWeight: '700',
  },
  profileDesc: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 13,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  savePrimaryBtn: {
    flex: 1.3,
    minHeight: 45,
    borderRadius: 12,
  },
  saveSecondaryBtn: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
  },
  scanHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scanInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subnetInput: {
    flex: 1,
  },
  subnetSuffix: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  scanBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0B0E15',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34D399',
  },
  discoveredItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#0E231D',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
  },
  connectSmallBtn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  scanningIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanningText: {
    color: '#93C5FD',
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  toggleTextCol: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  tipsCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 14,
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.2)',
  },
  tipItem: {
    color: '#CBD5E1',
    fontSize: 11.5,
    lineHeight: 16,
  },
});
