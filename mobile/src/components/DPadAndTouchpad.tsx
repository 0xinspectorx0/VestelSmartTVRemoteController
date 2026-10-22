import React, { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationMode } from '../types/tv';
import { RemoteButton } from './RemoteButton';

interface DPadAndTouchpadProps {
  mode: NavigationMode;
  onToggleMode: () => void;
  onUp: () => void;
  onDown: () => void;
  onLeft: () => void;
  onRight: () => void;
  onOk: () => void;
}

export const DPadAndTouchpad: React.FC<DPadAndTouchpadProps> = ({
  mode,
  onToggleMode,
  onUp,
  onDown,
  onLeft,
  onRight,
  onOk,
}) => {
  const [gestureHint, setGestureHint] = useState<string>('Kaydır: Yön • Dokun: OK');
  const handlersRef = useRef({ onUp, onDown, onLeft, onRight, onOk });
  handlersRef.current = { onUp, onDown, onLeft, onRight, onOk };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderRelease: (_, gestureState) => {
          const { dx, dy } = gestureState;
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);
          const swipeThreshold = 26;

          if (absX < 12 && absY < 12) {
            setGestureHint('OK');
            handlersRef.current.onOk();
            return;
          }

          if (absX >= swipeThreshold || absY >= swipeThreshold) {
            if (absX > absY) {
              if (dx > 0) {
                setGestureHint('Sağ ▶');
                handlersRef.current.onRight();
              } else {
                setGestureHint('◀ Sol');
                handlersRef.current.onLeft();
              }
            } else if (dy > 0) {
              setGestureHint('Aşağı ▼');
              handlersRef.current.onDown();
            } else {
              setGestureHint('Yukarı ▲');
              handlersRef.current.onUp();
            }
          }
        },
      }),
    []
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.modeSwitchRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            mode === 'dpad' ? 'Dokunmatik yüzeye geç' : 'Yön tuşlarına geç'
          }
          onPress={onToggleMode}
          style={({ pressed }) => [
            styles.modeBadge,
            pressed && styles.modeBadgePressed,
          ]}
        >
          <MaterialCommunityIcons
            name={mode === 'dpad' ? 'gesture-swipe' : 'gamepad-circle-outline'}
            size={14}
            color="#93C5FD"
          />
          <Text style={styles.modeBadgeText}>
            {mode === 'dpad' ? 'Touchpad' : 'Tuşlu D-Pad'}
          </Text>
        </Pressable>
      </View>

      {mode === 'dpad' ? (
        <View style={styles.dpadOuterRing}>
          <View style={styles.dpadRowTop}>
            <RemoteButton
              accessibilityLabel="Yukarı"
              variant="subtle"
              repeatable
              onPress={onUp}
              style={styles.dirButtonVertical}
              icon={<Ionicons name="chevron-up" size={24} color="#E2E8F0" />}
            />
          </View>

          <View style={styles.dpadRowMiddle}>
            <RemoteButton
              accessibilityLabel="Sol"
              variant="subtle"
              repeatable
              onPress={onLeft}
              style={styles.dirButtonHorizontal}
              icon={<Ionicons name="chevron-back" size={24} color="#E2E8F0" />}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="OK"
              onPress={onOk}
              style={({ pressed }) => [
                styles.okCenterButton,
                pressed && styles.okCenterPressed,
              ]}
            >
              <Text style={styles.okText}>OK</Text>
            </Pressable>

            <RemoteButton
              accessibilityLabel="Sağ"
              variant="subtle"
              repeatable
              onPress={onRight}
              style={styles.dirButtonHorizontal}
              icon={<Ionicons name="chevron-forward" size={24} color="#E2E8F0" />}
            />
          </View>

          <View style={styles.dpadRowBottom}>
            <RemoteButton
              accessibilityLabel="Aşağı"
              variant="subtle"
              repeatable
              onPress={onDown}
              style={styles.dirButtonVertical}
              icon={<Ionicons name="chevron-down" size={24} color="#E2E8F0" />}
            />
          </View>
        </View>
      ) : (
        <View {...panResponder.panHandlers} style={styles.touchpadSurface}>
          <View style={styles.touchpadDots}>
            <Ionicons name="chevron-up" size={16} color="#475569" />
          </View>
          <View style={styles.touchpadMiddle}>
            <Ionicons name="chevron-back" size={16} color="#475569" />
            <View style={styles.touchpadCenterInfo}>
              <MaterialCommunityIcons
                name="gesture-tap-hold"
                size={26}
                color="#60A5FA"
              />
              <Text style={styles.touchpadHint}>{gestureHint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#475569" />
          </View>
          <View style={styles.touchpadDots}>
            <Ionicons name="chevron-down" size={16} color="#475569" />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitchRow: {
    marginBottom: 8,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#161C28',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.22)',
  },
  modeBadgePressed: {
    opacity: 0.75,
  },
  modeBadgeText: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '600',
  },
  dpadOuterRing: {
    width: 186,
    height: 186,
    borderRadius: 93,
    backgroundColor: '#141821',
    borderWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.12)',
    borderLeftColor: 'rgba(255,255,255,0.06)',
    borderRightColor: 'rgba(255,255,255,0.04)',
    borderBottomColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  dpadRowTop: {
    alignItems: 'center',
  },
  dpadRowMiddle: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dpadRowBottom: {
    alignItems: 'center',
  },
  dirButtonVertical: {
    width: 64,
    height: 46,
    borderRadius: 20,
    backgroundColor: '#1B212E',
  },
  dirButtonHorizontal: {
    width: 46,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#1B212E',
  },
  okCenterButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#252E40',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(148,163,184,0.25)',
  },
  okCenterPressed: {
    backgroundColor: '#3B82F6',
    transform: [{ scale: 0.94 }],
  },
  okText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  touchpadSurface: {
    width: 186,
    height: 186,
    borderRadius: 34,
    backgroundColor: '#141923',
    borderWidth: 1.5,
    borderColor: 'rgba(96,165,250,0.28)',
    justifyContent: 'space-between',
    padding: 12,
  },
  touchpadDots: {
    alignItems: 'center',
  },
  touchpadMiddle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  touchpadCenterInfo: {
    alignItems: 'center',
    gap: 6,
    maxWidth: 120,
  },
  touchpadHint: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
