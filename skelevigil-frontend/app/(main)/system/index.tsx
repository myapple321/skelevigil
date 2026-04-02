import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { SV } from '@/src/theme/skelevigil';

function Row({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color={SV.muted} />
    </Pressable>
  );
}

export default function SystemIndexScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>My Account</Text>
        <View style={styles.card}>
          <Row title="My Profile" onPress={() => router.push('/(main)/system/profile')} />
        </View>

        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          <Row title="Help & Questions" onPress={() => router.push('/(main)/system/help')} />
          <View style={styles.divider} />
          <Row title="About SkeleVigil" onPress={() => router.push('/(main)/system/about')} />
        </View>

        <View style={styles.logoutWrap}>
          <Pressable
            onPress={() => {
              void signOut(getFirebaseAuth()).then(() => router.replace('/(auth)'));
            }}
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}>
            <FontAwesome6 name="right-from-bracket" size={18} color={SV.mediumOrange} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
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
    paddingBottom: 34,
  },
  sectionTitle: {
    color: SV.neonCyan,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 10,
  },
  card: {
    backgroundColor: SV.gunmetal,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.18)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowPressed: {
    backgroundColor: 'rgba(0,255,255,0.06)',
  },
  rowTitle: {
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,255,255,0.12)',
    marginLeft: 16,
  },
  logoutWrap: {
    marginTop: 26,
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,138,0,0.7)',
    backgroundColor: 'rgba(255,138,0,0.06)',
    minWidth: 200,
  },
  logoutPressed: {
    opacity: 0.85,
  },
  logoutText: {
    color: SV.mediumOrange,
    fontSize: 16,
    fontWeight: '700',
  },
});

