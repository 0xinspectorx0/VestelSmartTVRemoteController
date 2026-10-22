import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FavoriteChannel, VESTEL_KEYS, VestelKeyCode } from '../types/tv';
import { RemoteButton } from './RemoteButton';

interface KeypadTabProps {
  onSendKey: (code: VestelKeyCode, label: string) => void;
  onGoToChannel: (channelNumber: string) => Promise<void>;
  favorites: FavoriteChannel[];
  onAddFavorite: (name: string, number: number) => void;
  onRemoveFavorite: (id: string) => void;
  isChannelSending: boolean;
}

export const KeypadTab: React.FC<KeypadTabProps> = ({
  onSendKey,
  onGoToChannel,
  favorites,
  onAddFavorite,
  onRemoveFavorite,
  isChannelSending,
}) => {
  const [channelInput, setChannelInput] = useState('');
  const [showAddFav, setShowAddFav] = useState(false);
  const [newFavName, setNewFavName] = useState('');
  const [newFavNum, setNewFavNum] = useState('');
  const [editFavoritesMode, setEditFavoritesMode] = useState(false);

  const handleSubmitChannel = async () => {
    const cleaned = channelInput.trim();
    if (!cleaned || !/^\d+$/.test(cleaned)) {
      return;
    }
    await onGoToChannel(cleaned);
    setChannelInput('');
  };

  const handleCreateFavorite = () => {
    const parsedNum = Number(newFavNum.trim());
    if (!newFavName.trim() || !Number.isInteger(parsedNum) || parsedNum <= 0) {
      return;
    }
    onAddFavorite(newFavName.trim(), parsedNum);
    setNewFavName('');
    setNewFavNum('');
    setShowAddFav(false);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Doğrudan Kanala Git (channelDialog.py karşılığı) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="tv-outline" size={16} color="#60A5FA" />
            <Text style={styles.cardTitle}>Doğrudan Kanala Git</Text>
          </View>
          <Text style={styles.cardSubtitle}>Rakamları + OK tuşunu sırayla gönderir</Text>
        </View>

        <View style={styles.channelJumpRow}>
          <TextInput
            value={channelInput}
            onChangeText={(txt) => setChannelInput(txt.replace(/[^\d]/g, ''))}
            placeholder="Kanal no (örn: 24, 105)"
            placeholderTextColor="#64748B"
            keyboardType="number-pad"
            maxLength={4}
            returnKeyType="go"
            onSubmitEditing={handleSubmitChannel}
            style={styles.channelInput}
          />
          <RemoteButton
            label={isChannelSending ? 'Geçiliyor...' : 'Kanala Git'}
            variant="primary"
            disabled={isChannelSending || !channelInput.trim()}
            onPress={handleSubmitChannel}
            style={styles.goButton}
          />
        </View>
      </View>

      {/* Sayısal Tuş Takımı (1-9, 3D, 0, Önceki Kanal) */}
      <View style={styles.keypadGrid}>
        <View style={styles.keypadRow}>
          <RemoteButton
            label="1"
            onPress={() => onSendKey(VESTEL_KEYS.NUM_1, 'Kanal 1')}
            style={styles.numBtn}
          />
          <RemoteButton
            label="2"
            sublabel="ABC"
            onPress={() => onSendKey(VESTEL_KEYS.NUM_2, 'Kanal 2')}
            style={styles.numBtn}
          />
          <RemoteButton
            label="3"
            sublabel="DEF"
            onPress={() => onSendKey(VESTEL_KEYS.NUM_3, 'Kanal 3')}
            style={styles.numBtn}
          />
        </View>

        <View style={styles.keypadRow}>
          <RemoteButton
            label="4"
            sublabel="GHI"
            onPress={() => onSendKey(VESTEL_KEYS.NUM_4, 'Kanal 4')}
            style={styles.numBtn}
          />
          <RemoteButton
            label="5"
            sublabel="JKL"
            onPress={() => onSendKey(VESTEL_KEYS.NUM_5, 'Kanal 5')}
            style={styles.numBtn}
          />
          <RemoteButton
            label="6"
            sublabel="MNO"
            onPress={() => onSendKey(VESTEL_KEYS.NUM_6, 'Kanal 6')}
            style={styles.numBtn}
          />
        </View>

        <View style={styles.keypadRow}>
          <RemoteButton
            label="7"
            sublabel="PQRS"
            onPress={() => onSendKey(VESTEL_KEYS.NUM_7, 'Kanal 7')}
            style={styles.numBtn}
          />
          <RemoteButton
            label="8"
            sublabel="TUV"
            onPress={() => onSendKey(VESTEL_KEYS.NUM_8, 'Kanal 8')}
            style={styles.numBtn}
          />
          <RemoteButton
            label="9"
            sublabel="WXYZ"
            onPress={() => onSendKey(VESTEL_KEYS.NUM_9, 'Kanal 9')}
            style={styles.numBtn}
          />
        </View>

        <View style={styles.keypadRow}>
          <RemoteButton
            label="3D"
            variant="subtle"
            onPress={() => onSendKey(VESTEL_KEYS.THREE_D, '3D Modu')}
            style={styles.numBtn}
          />
          <RemoteButton
            label="0"
            onPress={() => onSendKey(VESTEL_KEYS.NUM_0, 'Kanal 0')}
            style={styles.numBtn}
          />
          <RemoteButton
            label="Önceki"
            variant="subtle"
            icon={<MaterialCommunityIcons name="swap-horizontal" size={18} color="#CBD5E1" />}
            onPress={() => onSendKey(VESTEL_KEYS.SWAP, 'Önceki Kanal')}
            style={styles.numBtn}
          />
        </View>
      </View>

      {/* Favori Kanallar */}
      <View style={styles.card}>
        <View style={styles.favHeaderRow}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="star" size={15} color="#FBBF24" />
            <Text style={styles.cardTitle}>Favori Kanallar</Text>
          </View>
          <View style={styles.favActionsRow}>
            <Pressable
              onPress={() => setEditFavoritesMode((prev) => !prev)}
              style={styles.smallHeaderAction}
            >
              <Text style={styles.smallHeaderActionText}>
                {editFavoritesMode ? 'Bitti' : 'Düzenle'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowAddFav((prev) => !prev)}
              style={[styles.smallHeaderAction, styles.smallHeaderActionPrimary]}
            >
              <Ionicons name="add" size={14} color="#BFDBFE" />
              <Text style={styles.smallHeaderActionText}>Ekle</Text>
            </Pressable>
          </View>
        </View>

        {showAddFav ? (
          <View style={styles.addFavForm}>
            <TextInput
              value={newFavName}
              onChangeText={setNewFavName}
              placeholder="Kanal adı (örn: TRT Spor)"
              placeholderTextColor="#64748B"
              style={[styles.channelInput, styles.favNameInput]}
            />
            <TextInput
              value={newFavNum}
              onChangeText={(t) => setNewFavNum(t.replace(/[^\d]/g, ''))}
              placeholder="No"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              maxLength={4}
              style={[styles.channelInput, styles.favNumInput]}
            />
            <RemoteButton
              label="Kaydet"
              variant="primary"
              onPress={handleCreateFavorite}
              style={styles.favSaveBtn}
            />
          </View>
        ) : null}

        <View style={styles.favGrid}>
          {favorites.map((fav) => (
            <Pressable
              key={fav.id}
              onPress={() => {
                if (editFavoritesMode) {
                  onRemoveFavorite(fav.id);
                } else {
                  onGoToChannel(String(fav.number));
                }
              }}
              style={({ pressed }) => [
                styles.favChip,
                pressed && styles.favChipPressed,
                editFavoritesMode && styles.favChipDeleteMode,
              ]}
            >
              <View
                style={[
                  styles.favNumberBadge,
                  { backgroundColor: fav.accent || '#3B82F6' },
                ]}
              >
                <Text style={styles.favNumberText}>{fav.number}</Text>
              </View>
              <Text numberOfLines={1} style={styles.favNameText}>
                {fav.name}
              </Text>
              {editFavoritesMode ? (
                <Ionicons name="close-circle" size={16} color="#F87171" />
              ) : null}
            </Pressable>
          ))}
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
  channelJumpRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  channelInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#0E1118',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  goButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  keypadGrid: {
    gap: 9,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 9,
  },
  numBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
  },
  favHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  favActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  smallHeaderAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#1E2433',
  },
  smallHeaderActionPrimary: {
    backgroundColor: '#1E3A8A',
  },
  smallHeaderActionText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  addFavForm: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  favNameInput: {
    flex: 2,
    height: 40,
    fontSize: 13,
  },
  favNumInput: {
    flex: 0.9,
    height: 40,
    fontSize: 13,
    textAlign: 'center',
  },
  favSaveBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  favGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  favChip: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1B2130',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  favChipPressed: {
    backgroundColor: '#273046',
    transform: [{ scale: 0.97 }],
  },
  favChipDeleteMode: {
    borderColor: 'rgba(248,113,113,0.4)',
  },
  favNumberBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 7,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  favNameText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
});
