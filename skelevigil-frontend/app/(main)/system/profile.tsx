import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SV } from '@/src/theme/skelevigil';

const PROFILE_STORAGE_KEY = 'skelevigil.profile.v1';

export default function MyProfileScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

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
});

