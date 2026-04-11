import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SV } from '@/src/theme/skelevigil';

const SUPPORT_EMAIL = 'support@veridiar.com';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const COMMAND_ROWS: { sector: string; description: string }[] = [
  {
    sector: 'Phases',
    description:
      'Your mission selector. Choose your level of engagement between Glimpse (Entry), Stare (Intermediate), or Trance (Elite).',
  },
  {
    sector: 'Vigil',
    description:
      'The active excavation site. This is where you interact with the neural block and attempt to secure the sequence before the collapse.',
  },
  {
    sector: 'Vault',
    description:
      'Your resource hub. Monitor your Mission Reserves, track your Lifetime Successes, and restore depleted credits.',
  },
  {
    sector: 'System',
    description:
      'The control panel. Manage your notifications, toggle mission alerts, and link your account to secure your progress.',
  },
];

export default function AboutSkeleVigilScreen() {
  const openMailto = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {
      Alert.alert('Contact', `Email us at ${SUPPORT_EMAIL}`);
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Application Details</Text>
        <Text style={styles.body}>
          Version: {APP_VERSION}
        </Text>

        <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Mission Overview</Text>
        <Text style={styles.body}>
          SkeleVigil is a high-stakes memory and logic experience set in a &quot;Surgical Noir&quot;
          universe. Players act as excavators of the mind, tasked with stabilizing neural blocks
          through focused observation and sequence recall. It is designed to challenge concentration
          through progressive difficulty tiers.
        </Text>

        <Text style={[styles.sectionTitle, styles.sectionSpaced]}>The Command Center</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.tableColSector}>Sector</Text>
          <Text style={styles.tableColDesc}>Description</Text>
        </View>
        {COMMAND_ROWS.map((row) => (
          <View key={row.sector} style={styles.tableRow}>
            <Text style={styles.sectorName}>{row.sector}</Text>
            <Text style={styles.bodyCell}>{row.description}</Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Legal &amp; Support</Text>
        <Pressable
          onPress={() => router.push('/(main)/system/privacy-policy')}
          style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
          accessibilityRole="link"
          accessibilityLabel="Privacy Policy">
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(main)/system/terms-of-service')}
          style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
          accessibilityRole="link"
          accessibilityLabel="Terms of Service">
          <Text style={styles.linkText}>Terms of Service</Text>
        </Pressable>

        <Text style={[styles.subheading, styles.contactHeading]}>Contact Us</Text>
        <Text style={styles.body}>
          If you have questions or require technical assistance, please reach out to the SkeleVigil
          support team:
        </Text>
        <Pressable
          onPress={openMailto}
          style={({ pressed }) => [styles.emailPressable, pressed && styles.linkPressed]}
          accessibilityRole="link"
          accessibilityLabel={`Email ${SUPPORT_EMAIL}`}>
          <Text style={styles.emailLink}>{SUPPORT_EMAIL}</Text>
        </Pressable>

        <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Disclaimer</Text>
        <Text style={styles.disclaimer}>
          SkeleVigil is intended purely for entertainment purposes. This application is not a
          medical tool, diagnostic instrument, or clinical method to support or treat cognitive
          functioning. If you have concerns regarding memory, focus, or general cognitive health,
          you should consult a qualified medical professional or healthcare expert.
        </Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  sectionTitle: {
    color: SV.neonCyan,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 12,
  },
  sectionSpaced: {
    marginTop: 28,
  },
  subheading: {
    color: SV.surgicalWhite,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 24,
  },
  contactHeading: {
    marginTop: 8,
    color: SV.neonCyan,
  },
  body: {
    color: SV.surgicalWhite,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 26,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,255,0.35)',
    paddingBottom: 8,
    marginBottom: 12,
    gap: 12,
  },
  tableColSector: {
    flex: 0.32,
    color: SV.neonCyan,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  tableColDesc: {
    flex: 1,
    color: SV.neonCyan,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  tableRow: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  sectorName: {
    color: SV.neonCyan,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 24,
  },
  bodyCell: {
    color: SV.surgicalWhite,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 26,
  },
  linkRow: {
    paddingVertical: 12,
    marginBottom: 4,
  },
  linkPressed: {
    opacity: 0.85,
  },
  linkText: {
    color: SV.neonCyan,
    fontSize: 18,
    fontWeight: '600',
    textDecorationLine: 'underline',
    lineHeight: 26,
  },
  emailPressable: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 6,
  },
  emailLink: {
    color: SV.neonCyan,
    fontSize: 18,
    fontWeight: '700',
    textDecorationLine: 'underline',
    lineHeight: 26,
    textAlign: 'center',
  },
  disclaimer: {
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    marginBottom: 8,
  },
});
