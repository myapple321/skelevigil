import { router } from 'expo-router';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { SV } from '@/src/theme/skelevigil';

const SUCCESS_CREDITS = 10;

const ATTEMPTS_LEFT = {
  glimpse: 3,
  stare: 2,
  trance: 1,
} as const;

export default function VaultScreen() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getFirebaseAuth().currentUser);

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

  const onBuyVaultCredits = () => {
    if (isGuest) {
      Alert.alert(
        'Secure Your Account',
        'To keep your purchases safe and available on all your devices, Guest accounts cannot buy credits. Please log in with Email, Apple, or Google to continue.',
        [
          {
            text: 'Go to Login',
            onPress: () => void goToLoginFromGuest(),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    Alert.alert('RevenueCat', 'This is a RevenueCat placeholder and will be added later.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.body}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vault Status</Text>
          <View style={styles.trackingBox}>
            <Text style={styles.trackingTitle}>Failure Tracking (Attempts Left)</Text>
            <Text style={styles.trackingLine}>Glimpse: {ATTEMPTS_LEFT.glimpse}</Text>
            <Text style={styles.trackingLine}>Stare: {ATTEMPTS_LEFT.stare}</Text>
            <Text style={styles.trackingLine}>Trance: {ATTEMPTS_LEFT.trance}</Text>
          </View>
          <View style={[styles.trackingBox, styles.creditsBox]}>
            <Text style={styles.successValue}>{SUCCESS_CREDITS} Credits toward Free Mission</Text>
            <Text style={styles.trackingLine}>Successful Mission: 0</Text>
          </View>
        </View>

        <View style={[styles.section, styles.purchaseSection]}>
          <Text style={styles.sectionTitle}>Purchase Area</Text>
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
    justifyContent: 'space-between',
    padding: 24,
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
  successValue: {
    color: SV.surgicalWhite,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
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
  },
  trackingLine: {
    color: 'rgba(240,240,240,0.92)',
    fontSize: 14,
    fontWeight: '600',
  },
  creditsBox: {
    marginTop: 12,
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
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  guestReminderText: {
    color: 'rgba(240,240,240,0.75)',
    fontSize: 13,
    textAlign: 'center',
  },
  guestReminderLinkWrap: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  guestReminderLink: {
    color: SV.neonCyan,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
