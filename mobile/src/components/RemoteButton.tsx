import React, { useCallback, useEffect, useRef } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

export type ButtonVariant =
  | 'default'
  | 'elevated'
  | 'power'
  | 'primary'
  | 'netflix'
  | 'youtube'
  | 'subtle';

interface RemoteButtonProps {
  label?: string;
  sublabel?: string;
  icon?: React.ReactNode;
  variant?: ButtonVariant;
  onPress: () => void;
  repeatable?: boolean;
  repeatDelayMs?: number;
  repeatIntervalMs?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const RemoteButton: React.FC<RemoteButtonProps> = ({
  label,
  sublabel,
  icon,
  variant = 'default',
  onPress,
  repeatable = false,
  repeatDelayMs = 380,
  repeatIntervalMs = 230,
  style,
  disabled = false,
  accessibilityLabel,
}) => {
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didRepeatRef = useRef(false);
  const latestOnPressRef = useRef(onPress);
  latestOnPressRef.current = onPress;

  const clearTimers = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const handlePressIn = useCallback(() => {
    if (disabled || !repeatable) {
      return;
    }
    didRepeatRef.current = false;
    clearTimers();
    holdTimeoutRef.current = setTimeout(() => {
      didRepeatRef.current = true;
      latestOnPressRef.current();
      repeatIntervalRef.current = setInterval(() => {
        latestOnPressRef.current();
      }, repeatIntervalMs);
    }, repeatDelayMs);
  }, [clearTimers, disabled, repeatDelayMs, repeatIntervalMs, repeatable]);

  const handlePressOut = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  const handlePress = useCallback(() => {
    if (disabled) {
      return;
    }
    if (repeatable && didRepeatRef.current) {
      didRepeatRef.current = false;
      return;
    }
    latestOnPressRef.current();
  }, [disabled, repeatable]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !disabled && styles.pressed,
        pressed && !disabled && variantPressedStyles[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon}
        {label ? (
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              icon ? styles.labelWithIcon : null,
              variant === 'power' ? styles.powerLabel : null,
              variant === 'netflix' ? styles.netflixLabel : null,
              variant === 'youtube' ? styles.youtubeLabel : null,
            ]}
          >
            {label}
          </Text>
        ) : null}
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    minWidth: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    borderLeftColor: 'rgba(255,255,255,0.06)',
    borderRightColor: 'rgba(255,255,255,0.04)',
    borderBottomColor: 'rgba(0,0,0,0.45)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelWithIcon: {
    marginTop: 3,
    fontSize: 11,
  },
  sublabel: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  powerLabel: {
    color: '#FECACA',
  },
  netflixLabel: {
    color: '#E50914',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  youtubeLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});

const variantStyles = StyleSheet.create({
  default: {
    backgroundColor: '#1C212C',
  },
  elevated: {
    backgroundColor: '#252C3B',
  },
  power: {
    backgroundColor: '#3A151B',
    borderTopColor: 'rgba(248,113,113,0.35)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  primary: {
    backgroundColor: '#1E3A8A',
    borderTopColor: 'rgba(96,165,250,0.4)',
  },
  netflix: {
    backgroundColor: '#141414',
    borderTopColor: 'rgba(229,9,20,0.45)',
    borderColor: 'rgba(229,9,20,0.28)',
  },
  youtube: {
    backgroundColor: '#241417',
    borderTopColor: 'rgba(255,0,51,0.4)',
    borderColor: 'rgba(255,0,51,0.25)',
  },
  subtle: {
    backgroundColor: '#151922',
  },
});

const variantPressedStyles = StyleSheet.create({
  default: {
    backgroundColor: '#2A3244',
  },
  elevated: {
    backgroundColor: '#333D52',
  },
  power: {
    backgroundColor: '#5B1D26',
  },
  primary: {
    backgroundColor: '#2563EB',
  },
  netflix: {
    backgroundColor: '#261214',
  },
  youtube: {
    backgroundColor: '#3B181E',
  },
  subtle: {
    backgroundColor: '#1F2533',
  },
});
