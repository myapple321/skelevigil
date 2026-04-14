import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SV } from '@/src/theme/skelevigil';

export default function SessionExpiredScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Session Expired</Text>
        <Text style={styles.body}>
          For your security, this session ended due to inactivity. Sign in again to continue your
          mission.
        </Text>
        <Pressable
          onPress={() => router.replace('/(auth)')}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
          <Text style={styles.ctaText}>Back to Login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SV.abyss,
  },
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  title: {
    color: SV.neonCyan,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: SV.surgicalWhite,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 360,
  },
  cta: {
    marginTop: 8,
    minHeight: 50,
    minWidth: 210,
    borderWidth: 1,
    borderColor: SV.neonCyan,
    borderRadius: 10,
    backgroundColor: SV.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    color: SV.black,
    fontSize: 17,
    fontWeight: '800',
  },
});
