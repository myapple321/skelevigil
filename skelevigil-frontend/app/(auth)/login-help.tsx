import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SvButton } from '@/src/components/auth/SvButton';
import { SV } from '@/src/theme/skelevigil';

export default function LoginHelpScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Login Help</Text>

        <Text style={styles.lead}>
          You can access your account using any of these three secure methods. For the smoothest
          experience, always use the same method you chose when you first joined.
        </Text>

        <View style={styles.block}>
          <Text style={styles.methodLine}>
            <Text style={styles.methodTitle}>Log in with Apple: </Text>
            <Text style={styles.body}>Private and integrated for Apple device users.</Text>
          </Text>
          <Text style={styles.methodLine}>
            <Text style={styles.methodTitle}>Log in with Google: </Text>
            <Text style={styles.body}>Fast and secure using your existing Google account.</Text>
          </Text>
          <Text style={styles.methodLine}>
            <Text style={styles.methodTitle}>Log in with Email: </Text>
            <Text style={styles.body}>The traditional way using a unique password.</Text>
          </Text>
        </View>

        <Text style={styles.sectionHeading}>Important: One Account per Email</Text>
        <Text style={styles.body}>
          To keep your personal data secure and organized, our system follows a &quot;One Account
          per Email&quot; rule.
        </Text>
        <Text style={[styles.body, styles.paragraphSpaced]}>
          Example: If you originally signed up using &quot;Log in with Google&quot; with your Gmail
          address, you cannot later use that same Gmail address to &quot;Log in with Email.&quot; You
          must continue using the Google button to access that specific account.
        </Text>

        <Text style={[styles.sectionHeading, styles.subsectionTop]}>Need a New Method?</Text>
        <Text style={styles.body}>
          If you wish to use the &quot;Log in with Email&quot; option specifically, you must provide
          an email address that has not already been linked to a Google or Apple login.
        </Text>

        <Text style={styles.hintLabel}>Hint:</Text>
        <Text style={styles.hintBody}>
          Most users choose the same method they use for their tablet or phone.
        </Text>

        <SvButton title="OK" onPress={() => router.back()} style={styles.okBtn} />
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
    paddingTop: 8,
    paddingBottom: 32,
  },
  title: {
    color: '#0E9595',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  lead: {
    color: SV.surgicalWhite,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 20,
  },
  block: {
    gap: 14,
    marginBottom: 24,
  },
  methodLine: {
    fontSize: 15,
    lineHeight: 22,
  },
  methodTitle: {
    color: SV.neonCyan,
    fontWeight: '700',
  },
  body: {
    color: 'rgba(240,240,240,0.92)',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  sectionHeading: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    lineHeight: 22,
  },
  subsectionTop: {
    marginTop: 8,
  },
  paragraphSpaced: {
    marginTop: 12,
  },
  hintLabel: {
    color: SV.neonCyan,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 6,
  },
  hintBody: {
    color: 'rgba(240,240,240,0.88)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 28,
  },
  okBtn: {
    marginTop: 8,
  },
});
