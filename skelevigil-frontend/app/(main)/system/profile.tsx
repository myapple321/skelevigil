import { useNavigation, useRouter } from 'expo-router';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { SV } from '@/src/theme/skelevigil';

const PROFILE_STORAGE_KEY = 'skelevigil.profile.v1';

const PROVIDER_LABEL: Record<string, string> = {
  password: 'Email',
  'apple.com': 'Apple',
  'google.com': 'Google',
};

function signInMethodLabel(user: User | null): string {
  if (!user) return '—';
  if (user.isAnonymous) return 'Guest';
  const names = user.providerData
    .map((p) => PROVIDER_LABEL[p.providerId])
    .filter((x): x is string => Boolean(x));
  const unique = [...new Set(names)];
  if (unique.length > 0) return unique.join(', ');
  return 'Account';
}

export default function MyProfileScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [authUser, setAuthUser] = useState<User | null>(() => getFirebaseAuth().currentUser);

  const signInLine = useMemo(() => signInMethodLabel(authUser), [authUser]);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), setAuthUser);
    return unsub;
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as { fullName?: string; email?: string };
        setFullName(saved.fullName ?? '');
        setEmail(saved.email ?? '');
      } catch {
        // Keep UI usable even if local storage is unavailable.
      }
    };
    loadProfile();
  }, []);

  const onEditSavePress = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    try {
      await AsyncStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({ fullName: fullName.trim(), email: email.trim() })
      );
      setFullName((value) => value.trim());
      setEmail((value) => value.trim());
    } catch {
      // Keep values in memory when storage write fails.
    } finally {
      setIsEditing(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.headerAction}>{'< Back'}</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable onPress={onEditSavePress} hitSlop={10}>
          <Text style={styles.headerAction}>{isEditing ? 'Save' : 'Edit'}</Text>
        </Pressable>
      ),
    });
  }, [navigation, router, isEditing, onEditSavePress]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.group}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadOnly]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. John Smith"
            placeholderTextColor={SV.muted}
            editable={isEditing}
          />
        </View>

        <View style={styles.group}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadOnly]}
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. john.smith@example.com"
            placeholderTextColor={SV.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={isEditing}
          />
        </View>

        <View style={styles.group}>
          <View style={styles.signInRow}>
            <Text style={styles.signInLabel}>Sign-in method:</Text>
            <Text style={styles.signInValue}>{signInLine}</Text>
          </View>
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
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerAction: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '600',
  },
  group: {
    marginBottom: 20,
  },
  label: {
    color: SV.surgicalWhite,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    color: SV.surgicalWhite,
    backgroundColor: SV.gunmetal,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputReadOnly: {
    opacity: 0.9,
  },
  signInRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  signInLabel: {
    color: SV.surgicalWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  signInValue: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '600',
  },
});

