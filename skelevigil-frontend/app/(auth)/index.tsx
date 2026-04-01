import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthFooter } from '@/src/components/auth/AuthFooter';
import { SvButton } from '@/src/components/auth/SvButton';
import { SV } from '@/src/theme/skelevigil';

export default function LoginLandingScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>SkeleVigil</Text>
        <Text style={styles.subtitle}>THE ART OF THE IMMUTABLE</Text>
        <View style={styles.divider} />
        <View style={styles.artPlaceholder}>
          <Text style={styles.artLabel}>SkeleVigil-LogIn-ArtWork</Text>
          <Text style={styles.artHint}>(placeholder)</Text>
        </View>
        <View style={styles.actions}>
          <SvButton title="Log in with Email" onPress={() => router.push('/(auth)/login-email')} />
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>
          <SvButton
            variant="secondary"
            title="Log in with Google"
            onPress={() => {}}
            icon={<Ionicons name="logo-google" size={22} color={SV.neonCyan} />}
          />
          <SvButton
            variant="secondary"
            title="Log in with Apple"
            onPress={() => {}}
            icon={<Ionicons name="logo-apple" size={22} color={SV.surgicalWhite} />}
          />
        </View>
        <AuthFooter onHelpPress={() => {}} />
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
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontFamily: 'SpaceMono',
    fontSize: 28,
    color: SV.surgicalWhite,
    textAlign: 'center',
    letterSpacing: 4,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 11,
    color: SV.neonCyan,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: SV.neonCyan,
    marginTop: 16,
    marginBottom: 20,
    opacity: 0.9,
  },
  artPlaceholder: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.25)',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  artLabel: {
    color: SV.surgicalWhite,
    fontSize: 13,
  },
  artHint: {
    color: SV.muted,
    fontSize: 11,
    marginTop: 6,
  },
  actions: {
    gap: 14,
    marginBottom: 32,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(240,240,240,0.2)',
  },
  orText: {
    color: SV.muted,
    paddingHorizontal: 12,
    fontSize: 12,
  },
});
