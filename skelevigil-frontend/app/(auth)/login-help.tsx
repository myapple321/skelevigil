import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SV } from '@/src/theme/skelevigil';

const SUPPORT_EMAIL = 'support@veridiar.com';

export default function LoginHelpScreen() {
  const openSupportEmail = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {
      Alert.alert('Contact', `Email us at ${SUPPORT_EMAIL}`);
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Choose Your Access Method</Text>

        <Text style={styles.lead}>
          To begin your mission, select one of the following methods. For the smoothest experience,
          always use the same method you chose when you first joined to ensure your progress is
          synchronized.
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
          <Text style={styles.methodLine}>
            <Text style={styles.methodTitle}>Log in as Guest: </Text>
            <Text style={styles.body}>
              Play immediately without an account. Note: Progress is stored only on this device and
              cannot be recovered if the app is deleted.
            </Text>
          </Text>
        </View>

        <Text style={styles.sectionHeading}>Important: One Account per Email</Text>
        <Text style={styles.body}>
          To keep your Mission Reserves and Vault Credits secure, our system follows a &quot;One
          Account per Email&quot; rule.
        </Text>
        <Text style={[styles.body, styles.paragraphSpaced]}>
          Example: If you originally signed up using &quot;Log in with Google&quot; with your Gmail
          address, you cannot later use that same Gmail address for &quot;Log in with Email.&quot;
          You must continue using the Google button to access that specific account.
        </Text>

        <Text style={[styles.sectionHeading, styles.subsectionTop]}>
          Managing Your Guest Account
        </Text>
        <Text style={styles.body}>
          If you start as a Guest, you can enjoy the full SkeleVigil experience. However, to
          purchase Vault Credits or ensure your progress is backed up, you will eventually be
          prompted to &quot;Link&quot; your Guest session to a secure Apple, Google, or Email
          account.
        </Text>

        <Text style={[styles.sectionHeading, styles.subsectionTop]}>Contact Us</Text>
        <Text style={styles.body}>
          Please contact the SkeleVigil support team via the email below.
        </Text>
        <Pressable
          onPress={openSupportEmail}
          accessibilityRole="link"
          accessibilityLabel={`Email ${SUPPORT_EMAIL}`}
          style={({ pressed }) => [styles.emailPressable, pressed && styles.emailPressablePressed]}>
          <Text style={styles.emailLink}>{SUPPORT_EMAIL}</Text>
        </Pressable>
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
  emailPressable: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 4,
  },
  emailPressablePressed: {
    opacity: 0.75,
  },
  emailLink: {
    color: SV.neonCyan,
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
