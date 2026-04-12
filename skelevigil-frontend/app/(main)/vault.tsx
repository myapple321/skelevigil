import { router } from 'expo-router';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  PurchaseAllocationModal,
  type VaultPhaseTier,
} from '@/src/components/vault/PurchaseAllocationModal';
import { useVaultProgress } from '@/src/contexts/VaultProgressContext';
import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { FREE_MISSION_CREDIT_ALLOWANCE } from '@/src/preferences/vaultProgress';
import { SV } from '@/src/theme/skelevigil';

/** Same fills as Phases screen Play now buttons (`PHASE_BTN` in phases.tsx). */
const PHASE_RESERVE_LABEL_COLOR = {
  glimpseGrey: '#8A8E91',
  stareTeal: '#0E9595',
  tranceLightOrange: '#F5BF8A',
} as const;

export default function VaultScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getFirebaseAuth().currentUser);
  const { progress, hydrated } = useVaultProgress();
  const [purchaseAllocationOpen, setPurchaseAllocationOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => setCurrentUser(user));
    return unsub;
  }, []);

  const isGuest = useMemo(() => currentUser?.isAnonymous === true, [currentUser]);

  const goToLoginFromGuest = async () => {
    try {
      await signOut(getFirebaseAuth());
      router.replace('/(auth)');
    } catch {
      Alert.alert('Sign out failed', 'Please try again.');
    }
  };

  /**
   * Purchase flow: open allocation modal first. After user picks a phase, call RevenueCat
   * `Purchases.purchasePackage` (not wired yet). On IAP success, grant +3 to that phase in Firestore.
   */
  const onBuyVaultCredits = () => {
    setPurchaseAllocationOpen(true);
  };

  const onPurchaseAllocationSelectPhase = (tier: VaultPhaseTier) => {
    setPurchaseAllocationOpen(false);
    if (isGuest) return;
    Alert.alert(
      'RevenueCat',
      `This is a RevenueCat placeholder and will be added later.\n\nSelected phase: ${tier}. Wire Purchases.purchasePackage here, then on success call grant +3 for this phase in Firestore.`,
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <PurchaseAllocationModal
        visible={purchaseAllocationOpen}
        onRequestClose={() => setPurchaseAllocationOpen(false)}
        isGuest={isGuest}
        attemptsLeft={progress.attemptsLeft}
        onLinkAccount={() => void goToLoginFromGuest()}
        onSelectPhase={onPurchaseAllocationSelectPhase}
      />
      <View style={styles.body}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vault Scoreboard</Text>
          <View style={styles.trackingBox}>
            <Text style={styles.trackingTitle}>Mission Reserves Available</Text>
            <Text style={[styles.trackingLine, { color: PHASE_RESERVE_LABEL_COLOR.glimpseGrey }]}>
              Glimpse Phase: {progress.attemptsLeft.glimpse}
            </Text>
            <Text style={[styles.trackingLine, { color: PHASE_RESERVE_LABEL_COLOR.stareTeal }]}>
              Stare Phase: {progress.attemptsLeft.stare}
            </Text>
            <Text style={[styles.trackingLine, { color: PHASE_RESERVE_LABEL_COLOR.tranceLightOrange }]}>
              Trance Phase: {progress.attemptsLeft.trance}
            </Text>
          </View>
          <View style={[styles.trackingBox, styles.restorationBox]}>
            <Text style={styles.restorationLabel}>Progress to Free Restoration</Text>
            <Text style={styles.restorationCount} accessibilityLabel="Progress to free restoration">
              {progress.successfulMissions} / {FREE_MISSION_CREDIT_ALLOWANCE}
            </Text>
            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: FREE_MISSION_CREDIT_ALLOWANCE,
                now: progress.successfulMissions,
              }}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(1, progress.successfulMissions / FREE_MISSION_CREDIT_ALLOWANCE) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.trackingLine}>
              Lifetime Missions Secured: {progress.lifetimeMissions}
            </Text>
          </View>
          {!hydrated ? <Text style={styles.syncHint}>Syncing vault progress...</Text> : null}
        </View>

        <View style={[styles.section, styles.purchaseSection]}>
          <Text style={styles.sectionTitle}>Purchase Method</Text>
          <Pressable
            onPress={onBuyVaultCredits}
            style={({ pressed }) => [styles.buyButton, pressed && styles.buyButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Buy 3 Vault Credits for zero dollars and ninety-nine cents">
            <Text style={styles.buyButtonText}>Buy 3 Vault Credits - $0.99</Text>
          </Pressable>
          <Text style={styles.buySubtext}>One-time purchase. No recurring fees.</Text>

          {isGuest ? (
            <View style={styles.guestReminderRow}>
              <Text style={styles.guestReminderText}>Status: Guest Mode (Unsecured). </Text>
              <Pressable onPress={() => void goToLoginFromGuest()} style={styles.guestReminderLinkWrap}>
                <Text style={styles.guestReminderLink}>Link Account</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SV.abyss,
  },
  body: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 24,
    gap: 10,
  },
  section: {
    width: '100%',
  },
  sectionTitle: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  restorationLabel: {
    color: SV.surgicalWhite,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  restorationCount: {
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,255,255,0.12)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.28)',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: SV.neonCyan,
  },
  trackingBox: {
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.25)',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 14,
    gap: 6,
  },
  trackingTitle: {
    color: SV.surgicalWhite,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  trackingLine: {
    color: 'rgba(240,240,240,0.92)',
    fontSize: 14,
    fontWeight: '600',
  },
  restorationBox: {
    marginTop: 12,
  },
  syncHint: {
    marginTop: 10,
    color: SV.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  purchaseSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  buyButton: {
    width: '100%',
    maxWidth: 420,
    minHeight: 54,
    backgroundColor: SV.neonCyan,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buyButtonPressed: {
    opacity: 0.88,
  },
  buyButtonText: {
    color: SV.black,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  buySubtext: {
    color: SV.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  guestReminderRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    gap: 4,
  },
  guestReminderText: {
    color: 'rgba(240,240,240,0.9)',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  guestReminderLinkWrap: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  guestReminderLink: {
    color: SV.neonCyan,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
