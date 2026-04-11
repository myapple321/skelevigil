import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
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

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'Does SkeleVigil support sound effects?',
    answer:
      'Yes. You can enable or disable auditory feedback in the System settings. We recommend keeping them on for the full "Surgical Noir" experience, as sound cues can help with mission timing.',
  },
  {
    question: 'What are Mission Alerts?',
    answer:
      'Mission Alerts are notifications sent to your device. They remind you of active excavations you\'ve left behind and notify you when a Monthly Gift is ready to be claimed.',
  },
  {
    question: 'How can I get the Mission Gift?',
    answer:
      'Once a month, a Free Mission is authorized for your account. You will receive a notification on your phone; simply tap it to claim your credit. The gift rotates between your Trance, Stare, and Glimpse reserves.',
  },
  {
    question: 'What are the Mission Reserves in the Vault?',
    answer:
      'These are your "lives" or attempts. Each time you start a New Mission, one credit is used from your reserves. If you run out, you can earn more through successful gameplay or by visiting the Purchase Method area.',
  },
  {
    question: 'How does the Progress to Free Restoration work?',
    answer:
      'For every 10 missions you successfully complete, the Vault synchronizes and rewards you with one free attempt added to your reserves automatically.',
  },
  {
    question: 'What is the "Buy 3 Vault Credits" option?',
    answer: `This allows you to instantly add 3 attempts to your reserves for $0.99.

One-time purchase: This is not a subscription. You will only be charged when you manually tap the button.

Guest Users: Please note that Guest accounts are not permitted to make purchases to protect your funds. You must link a Google, Apple, or Email account first.`,
  },
  {
    question: 'What is in the System settings?',
    answer: `Manage Profile: Update your details or change your secure password.

Sound Effects: Toggle the "Vigil" audio on or off. Default is off.

System Notifications: Enable or disable Mission Alerts. Default is off.

Delete Account: Permanently remove your data from our servers.`,
  },
];

function FaqAccordionItem({
  question,
  answer,
  expanded,
  onToggle,
}: {
  question: string;
  answer: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.faqItem}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.faqHeader, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${question}. ${expanded ? 'Expanded' : 'Collapsed'}. Tap to ${expanded ? 'collapse' : 'expand'}.`}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={SV.neonCyan}
          style={styles.faqChevron}
        />
      </Pressable>
      {expanded ? <Text style={styles.faqAnswer}>{answer}</Text> : null}
    </View>
  );
}

export default function HelpQuestionsScreen() {
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  const toggleFaq = useCallback((index: number) => {
    setExpandedFaqIndex((prev) => (prev === index ? null : index));
  }, []);

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
        <Text style={styles.sectionTitle}>Help</Text>

        <Text style={styles.subheading}>Getting Started</Text>
        <Text style={styles.body}>
          Begin your journey in the Phases tab. Select a difficulty level to enter the Vigil. Your goal
          is to observe the neural block and secure the sequence before the time limit expires.
        </Text>

        <Text style={[styles.subheading, styles.helpSubSpaced]}>Settings</Text>
        <Text style={styles.body}>
          Tailor your experience in the System tab. Here you can manage your security, toggle mission
          sounds, and adjust how the app communicates with you.
        </Text>

        <Text style={[styles.subheading, styles.helpSubSpaced]}>Support</Text>
        <Text style={styles.body}>Our team is here to help with any technical hurdles.</Text>
        <Pressable
          onPress={openMailto}
          style={({ pressed }) => [styles.emailPressable, pressed && styles.pressed]}
          accessibilityRole="link"
          accessibilityLabel={`Email ${SUPPORT_EMAIL}`}>
          <Text style={styles.emailLink}>{SUPPORT_EMAIL}</Text>
        </Pressable>

        <View style={styles.sectionDivider} accessibilityRole="none">
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.sectionTitle}>FAQ — Frequently Asked Questions</Text>
        {FAQ_ITEMS.map((item, index) => (
          <FaqAccordionItem
            key={item.question}
            question={item.question}
            answer={item.answer}
            expanded={expandedFaqIndex === index}
            onToggle={() => toggleFaq(index)}
          />
        ))}
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
    marginBottom: 14,
  },
  subheading: {
    color: SV.neonCyan,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 8,
  },
  helpSubSpaced: {
    marginTop: 20,
  },
  body: {
    color: SV.surgicalWhite,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 26,
  },
  emailPressable: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
    marginBottom: 8,
  },
  emailLink: {
    color: SV.neonCyan,
    fontSize: 18,
    fontWeight: '700',
    textDecorationLine: 'underline',
    lineHeight: 26,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
  sectionDivider: {
    marginVertical: 28,
    width: '100%',
  },
  dividerLine: {
    height: 2,
    backgroundColor: 'rgba(0, 255, 255, 0.55)',
    borderRadius: 1,
  },
  faqItem: {
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.14)',
    paddingBottom: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    minHeight: 48,
  },
  faqQuestion: {
    flex: 1,
    color: SV.surgicalWhite,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  faqChevron: {
    marginTop: 2,
  },
  faqAnswer: {
    color: SV.surgicalWhite,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 26,
    paddingBottom: 8,
    paddingLeft: 2,
  },
});
