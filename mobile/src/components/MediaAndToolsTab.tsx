import React, { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VESTEL_KEYS, VestelKeyCode } from '../types/tv';
import { RemoteButton } from './RemoteButton';

interface MediaAndToolsTabProps {
  onSendKey: (code: VestelKeyCode, label: string) => void;
  onLaunchApp: (appName: string) => void;
  onBatchVolume: (
    steps: number,
    direction: 'up' | 'down',
    signal: AbortSignal,
    onProgress: (curr: number, total: number) => void
  ) => Promise<void>;
}

export const MediaAndToolsTab: React.FC<MediaAndToolsTabProps> = ({
  onSendKey,
  onLaunchApp,
  onBatchVolume,
}) => {
  const [customSteps, setCustomSteps] = useState('5');
  const [batchProgress, setBatchProgress] = useState<{
    curr: number;
    total: number;
    direction: 'up' | 'down';
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runVolumeBatch = async (steps: number, direction: 'up' | 'down') => {
    if (!Number.isInteger(steps) || steps <= 0) {
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBatchProgress({ curr: 0, total: steps, direction });
    try {
      await onBatchVolume(steps, direction, controller.signal, (curr, total) => {
        setBatchProgress({ curr, total, direction });
      });
    } finally {
      setBatchProgress(null);
      abortRef.current = null;
    }
  };

  const stopVolumeBatch = () => {
    abortRef.current?.abort();
    setBatchProgress(null);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Medya Oynatıcı Kontrolleri */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="play-circle-outline" size={17} color="#60A5FA" />
          <Text style={styles.cardTitle}>Medya ve Kayıt Kontrolleri</Text>
        </View>

        <View style={styles.row}>
          <RemoteButton
            label="Geri Sar"
            icon={<Ionicons name="play-back" size={18} color="#E2E8F0" />}
            onPress={() => onSendKey(VESTEL_KEYS.REWIND, 'Geri Sar')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="Oynat"
            variant="elevated"
            icon={<Ionicons name="play" size={18} color="#34D399" />}
            onPress={() => onSendKey(VESTEL_KEYS.PLAY, 'Oynat')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="Duraklat"
            variant="elevated"
            icon={<Ionicons name="pause" size={18} color="#FBBF24" />}
            onPress={() => onSendKey(VESTEL_KEYS.PAUSE, 'Duraklat')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="İleri Sar"
            icon={<Ionicons name="play-forward" size={18} color="#E2E8F0" />}
            onPress={() => onSendKey(VESTEL_KEYS.FAST_FORWARD, 'İleri Sar')}
            style={styles.flexBtn}
          />
        </View>

        <View style={styles.row}>
          <RemoteButton
            label="Kayıt (REC)"
            icon={<MaterialCommunityIcons name="record-circle" size={18} color="#EF4444" />}
            onPress={() => onSendKey(VESTEL_KEYS.RECORD, 'Kayıt (REC)')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="Durdur"
            icon={<Ionicons name="stop" size={18} color="#E2E8F0" />}
            onPress={() => onSendKey(VESTEL_KEYS.STOP, 'Durdur')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="Medya"
            icon={<Ionicons name="folder-open-outline" size={18} color="#93C5FD" />}
            onPress={() => onSendKey(VESTEL_KEYS.MEDIA, 'Medya Tarayıcı')}
            style={styles.flexBtn}
          />
        </View>
      </View>

      {/* Toplu Ses Değiştirici (volumeDialog.py karşılığı) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="volume-high-outline" size={17} color="#34D399" />
            <Text style={styles.cardTitle}>Hızlı / Toplu Ses Ayarı</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Belirttiğiniz adım kadar arka arkaya Ses + / - gönderir
          </Text>
        </View>

        <View style={styles.row}>
          <RemoteButton
            label="-10"
            variant="subtle"
            disabled={Boolean(batchProgress)}
            onPress={() => runVolumeBatch(10, 'down')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="-5"
            variant="subtle"
            disabled={Boolean(batchProgress)}
            onPress={() => runVolumeBatch(5, 'down')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="+5"
            variant="subtle"
            disabled={Boolean(batchProgress)}
            onPress={() => runVolumeBatch(5, 'up')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="+10"
            variant="subtle"
            disabled={Boolean(batchProgress)}
            onPress={() => runVolumeBatch(10, 'up')}
            style={styles.flexBtn}
          />
        </View>

        <View style={styles.customVolRow}>
          <TextInput
            value={customSteps}
            onChangeText={(t) => setCustomSteps(t.replace(/[^\d]/g, ''))}
            placeholder="Adım"
            placeholderTextColor="#64748B"
            keyboardType="number-pad"
            maxLength={2}
            style={styles.stepInput}
          />
          {batchProgress ? (
            <RemoteButton
              label={`Durdur (${batchProgress.curr}/${batchProgress.total})`}
              variant="power"
              onPress={stopVolumeBatch}
              style={styles.batchActionBtn}
            />
          ) : (
            <>
              <RemoteButton
                label="Ses Azalt"
                icon={<Ionicons name="volume-low" size={16} color="#E2E8F0" />}
                onPress={() => runVolumeBatch(Number(customSteps || 0), 'down')}
                style={styles.batchActionBtn}
              />
              <RemoteButton
                label="Ses Artır"
                variant="primary"
                icon={<Ionicons name="volume-high" size={16} color="#FFFFFF" />}
                onPress={() => runVolumeBatch(Number(customSteps || 0), 'up')}
                style={styles.batchActionBtn}
              />
            </>
          )}
        </View>
      </View>

      {/* Gelişmiş TV Özellikleri ve Uygulamalar */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="layers-outline" size={16} color="#A78BFA" />
          <Text style={styles.cardTitle}>TV Fonksiyonları ve Uygulamalar</Text>
        </View>

        <View style={styles.row}>
          <RemoteButton
            label="Altyazı"
            icon={<MaterialCommunityIcons name="subtitles-outline" size={18} color="#E2E8F0" />}
            onPress={() => onSendKey(VESTEL_KEYS.SUBTITLE, 'Altyazı')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="Dil / Ses"
            icon={<Ionicons name="language-outline" size={18} color="#E2E8F0" />}
            onPress={() => onSendKey(VESTEL_KEYS.LANGUAGE, 'Dil Seçimi')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="Rehber (EPG)"
            icon={<Ionicons name="calendar-outline" size={18} color="#E2E8F0" />}
            onPress={() => onSendKey(VESTEL_KEYS.EPG, 'EPG Yayın Rehberi')}
            style={styles.flexBtn}
          />
        </View>

        <View style={styles.row}>
          <RemoteButton
            label="Teletext"
            icon={<MaterialCommunityIcons name="card-text-outline" size={18} color="#E2E8F0" />}
            onPress={() => onSendKey(VESTEL_KEYS.TELETEXT, 'Teletext')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="Tarayıcı"
            icon={<Ionicons name="globe-outline" size={18} color="#60A5FA" />}
            onPress={() => onSendKey(VESTEL_KEYS.INTERNET, 'İnternet Tarayıcı')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="3D Modu"
            icon={<MaterialCommunityIcons name="video-3d" size={20} color="#E2E8F0" />}
            onPress={() => onSendKey(VESTEL_KEYS.THREE_D, '3D Modu')}
            style={styles.flexBtn}
          />
        </View>

        <View style={styles.row}>
          <RemoteButton
            label="NETFLIX"
            variant="netflix"
            onPress={() => onLaunchApp('Netflix')}
            style={styles.flexBtn}
          />
          <RemoteButton
            label="YouTube"
            variant="youtube"
            icon={<Ionicons name="logo-youtube" size={18} color="#FF0033" />}
            onPress={() => onLaunchApp('YouTube')}
            style={styles.flexBtn}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    gap: 14,
    paddingBottom: 14,
  },
  card: {
    backgroundColor: '#141822',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 10,
  },
  cardHeader: {
    gap: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  flexBtn: {
    flex: 1,
    minHeight: 54,
  },
  customVolRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  stepInput: {
    width: 68,
    height: 46,
    backgroundColor: '#0E1118',
    borderRadius: 12,
    textAlign: 'center',
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  batchActionBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
  },
});
