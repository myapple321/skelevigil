import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Legal doc screens: black field, neon cyan titles, white body (per spec). */
const BG = '#000000';
const CYAN = '#00FFFF';
const WHITE = '#FFFFFF';

type LegalDocumentLayoutProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalDocumentLayout({ title, lastUpdated, children }: LegalDocumentLayoutProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled">
        <Text style={styles.docTitle}>{title}</Text>
        <Text style={styles.lastUpdated}>Last Updated: {lastUpdated}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function LegalSubheading({ children }: { children: ReactNode }) {
  return <Text style={legalStyles.subheading}>{children}</Text>;
}

export function LegalSectionTitle({ children }: { children: ReactNode }) {
  return <Text style={legalStyles.sectionTitle}>{children}</Text>;
}

export function LegalBody({ children }: { children: ReactNode }) {
  return <Text style={legalStyles.body}>{children}</Text>;
}

export function LegalBullet({ boldLead, rest }: { boldLead: string; rest: string }) {
  return (
    <View style={legalStyles.bulletRow}>
      <Text style={legalStyles.bulletMark}>{'\u2022'}</Text>
      <Text style={legalStyles.body}>
        <Text style={legalStyles.bold}>{boldLead}</Text>
        {rest}
      </Text>
    </View>
  );
}

export function LegalSimpleBullet({ children }: { children: ReactNode }) {
  return (
    <View style={legalStyles.bulletRow}>
      <Text style={legalStyles.bulletMark}>{'\u2022'}</Text>
      <Text style={legalStyles.body}>{children}</Text>
    </View>
  );
}

export const legalStyles = StyleSheet.create({
  subheading: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: 18,
    marginBottom: 10,
  },
  body: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 26,
    flexShrink: 1,
  },
  bold: {
    fontWeight: '700',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingRight: 4,
  },
  bulletMark: {
    color: WHITE,
    fontSize: 18,
    lineHeight: 26,
    marginRight: 8,
    width: 14,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    padding: 20,
    paddingBottom: 36,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  docTitle: {
    color: CYAN,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 8,
  },
  lastUpdated: {
    color: WHITE,
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 26,
    marginBottom: 16,
  },
});
