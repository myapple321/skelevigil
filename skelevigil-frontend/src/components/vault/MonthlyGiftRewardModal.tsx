import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { SV } from '@/src/theme/skelevigil';

type Props = {
  visible: boolean;
  /** Full confirmation line, e.g. "Free Mission Claimed! Your Trance reserves…" */
  message: string;
  onDismiss: () => void;
};

/**
 * Custom celebration overlay when a monthly rotational gift is claimed (secured account).
 */
export function MonthlyGiftRewardModal({ visible, message, onDismiss }: Props) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.88);
      opacity.setValue(0);
      return;
    }
    scale.setValue(0.88);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 78,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, scale, opacity]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onDismiss}
          accessibilityLabel="Dismiss reward"
        />
        <Animated.View
          style={[
            styles.card,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}>
          <Text style={styles.message}>{message}</Text>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.ok, pressed && styles.okPressed]}
            accessibilityRole="button"
            accessibilityLabel="Dismiss">
            <Text style={styles.okText}>OK</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    zIndex: 1,
    backgroundColor: SV.gunmetal,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.45)',
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  message: {
    color: SV.surgicalWhite,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 22,
  },
  ok: {
    alignSelf: 'center',
    backgroundColor: SV.neonCyan,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  okPressed: {
    opacity: 0.88,
  },
  okText: {
    color: SV.black,
    fontSize: 16,
    fontWeight: '800',
  },
});
