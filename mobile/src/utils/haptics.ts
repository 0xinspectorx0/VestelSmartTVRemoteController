import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type HapticStrength = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export async function triggerHaptic(
  enabled: boolean,
  strength: HapticStrength = 'light'
): Promise<void> {
  if (!enabled || Platform.OS === 'web') {
    return;
  }

  try {
    switch (strength) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // Haptic desteklenmeyen cihazlarda sessizce devam et
  }
}
