import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSessionSecurity } from '@/src/contexts/SessionSecurityContext';
import {
  LOCK_SCREEN_MINUTE_OPTIONS,
  type LockScreenMinutes,
} from '@/src/preferences/lockScreenPreference';
import { SV } from '@/src/theme/skelevigil';

const LOCK_SCREEN_LABEL: Record<LockScreenMinutes, string> = {
  5: '5 Minutes (Secure)',
  10: '10 Minutes (Standard)',
  20: '20 Minutes (Relaxed)',
  30: '30 Minutes (Maximum)',
};

export default function LockScreenSettingsScreen() {
  const {
    lockScreenMinutes,
    setLockScreenMinutes,
    keepAwakeDuringMissions,
    setKeepAwakeDuringMissions,
    hydrated,
  } = useSessionSecurity();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Lock-Screen</Text>
        <Text style={styles.subtitle}>
          Select secure inactivity timeout and optionally keep the device awake while Vigil is active.
        </Text>

        <View style={styles.card}>
          {LOCK_SCREEN_MINUTE_OPTIONS.map((minutes, idx) => {
            const selected = lockScreenMinutes === minutes;
            return (
              <View key={minutes}>
                <Pressable
                  onPress={() => void setLockScreenMinutes(minutes)}
                  disabled={!hydrated}
                  style={({ pressed }) => [
                    styles.optionRow,
                    selected && styles.optionRowActive,
                    pressed && hydrated && styles.optionRowPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: !hydrated }}
                  accessibilityLabel={LOCK_SCREEN_LABEL[minutes]}>
                  <View style={styles.optionMain}>
                    <Text style={[styles.optionText, selected && styles.optionTextActive]}>
                      {LOCK_SCREEN_LABEL[minutes]}
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selected ? SV.neonCyan : SV.muted}
                  />
                </Pressable>
                {idx < LOCK_SCREEN_MINUTE_OPTIONS.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleBody}>
              <Text style={styles.toggleTitle}>Keep Awake during Missions</Text>
              <Text style={styles.toggleSub}>
                Prevent iOS Auto-Lock only while Vigil screen is focused.
              </Text>
            </View>
            <Switch
              value={keepAwakeDuringMissions}
              disabled={!hydrated}
              onValueChange={(v) => void setKeepAwakeDuringMissions(v)}
              trackColor={{ false: 'rgba(255,255,255,0.14)', true: 'rgba(0,255,255,0.35)' }}
              thumbColor={keepAwakeDuringMissions ? SV.surgicalWhite : 'rgba(200,200,200,0.95)'}
              ios_backgroundColor="rgba(255,255,255,0.14)"
              accessibilityLabel="Keep awake during missions"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SV.abyss,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 14,
  },
  title: {
    color: SV.neonCyan,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(240,240,240,0.82)',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: SV.gunmetal,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.18)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionRow: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionRowPressed: {
    backgroundColor: 'rgba(0,255,255,0.06)',
  },
  optionRowActive: {
    backgroundColor: 'rgba(0,255,255,0.11)',
  },
  optionMain: {
    flex: 1,
    minWidth: 0,
  },
  optionText: {
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  optionTextActive: {
    color: SV.neonCyan,
  },
  divider: {
    height: 1,
    marginLeft: 16,
    backgroundColor: 'rgba(0,255,255,0.12)',
  },
  toggleRow: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  toggleTitle: {
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  toggleSub: {
    color: SV.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
