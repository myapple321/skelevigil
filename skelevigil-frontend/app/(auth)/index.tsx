import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthFooter } from '@/src/components/auth/AuthFooter';
import { GoogleMarkIcon } from '@/src/components/auth/GoogleMarkIcon';
import { SvButton } from '@/src/components/auth/SvButton';
import { NeuralString } from '@/src/components/NeuralString';
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
        <NeuralString />
        <View style={styles.actions}>
          <SvButton title="Log in with Email" onPress={() => router.push('/(auth)/login-email')} />
          <SvButton
            variant="secondary"
            title="Log in with Google"
            onPress={() => {}}
            icon={<GoogleMarkIcon size={22} />}
          />
          <SvButton
            variant="secondary"
            title="Log in with Apple"
            onPress={() => {}}
            icon={<Ionicons name="logo-apple" size={22} color="#FFFFFF" />}
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
    marginBottom: 24,
    fontSize: 11,
    color: SV.neonCyan,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
  },
  actions: {
    gap: 14,
    marginBottom: 32,
  },
});
