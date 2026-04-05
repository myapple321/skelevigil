import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { SV } from '@/src/theme/skelevigil';

/** Matches auth screens (e.g. Log in with Email) — teal back control for native headers. */
export function SvHeaderBack() {
  return (
    <Pressable onPress={() => router.back()} hitSlop={12} style={styles.wrap}>
      <Text style={styles.back}>‹ Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  back: {
    color: SV.neonCyan,
    fontSize: 16,
  },
});
