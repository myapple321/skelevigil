import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  DEFAULT_VAULT_PROGRESS,
  FREE_MISSION_CREDIT_ALLOWANCE,
  normalizeVaultProgressFromDebugInput,
  type VaultProgress,
} from '@/src/preferences/vaultProgress';
import { SV } from '@/src/theme/skelevigil';

function parseIntLoose(s: string, fallback: number): number {
  const t = s.trim().replace(/\s/g, '');
  if (t === '' || t === '-') return fallback;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : fallback;
}

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  /** Current vault state — fields copy from this whenever the modal opens. */
  seedProgress: VaultProgress;
  onApply: (next: VaultProgress) => Promise<void>;
  onResetToDefaults: () => Promise<void>;
  busy?: boolean;
};

export function DebugVaultValuesModal({
  visible,
  onRequestClose,
  seedProgress,
  onApply,
  onResetToDefaults,
  busy = false,
}: Props) {
  const [glimpse, setGlimpse] = useState('');
  const [stare, setStare] = useState('');
  const [trance, setTrance] = useState('');
  const [successfulMissions, setSuccessfulMissions] = useState('');
  const [lifetimeMissions, setLifetimeMissions] = useState('');
  const [giftRotationIndex, setGiftRotationIndex] = useState('');

  const hydrateFromSeed = useCallback((p: VaultProgress) => {
    setGlimpse(String(p.attemptsLeft.glimpse));
    setStare(String(p.attemptsLeft.stare));
    setTrance(String(p.attemptsLeft.trance));
    setSuccessfulMissions(String(p.successfulMissions));
    setLifetimeMissions(String(p.lifetimeMissions));
    setGiftRotationIndex(String(p.giftRotationIndex));
  }, []);

  useEffect(() => {
    if (visible) {
      hydrateFromSeed(seedProgress);
    }
  }, [visible, seedProgress, hydrateFromSeed]);

  const fillFormDefaults = useCallback(() => {
    hydrateFromSeed({
      ...DEFAULT_VAULT_PROGRESS,
      attemptsLeft: { ...DEFAULT_VAULT_PROGRESS.attemptsLeft },
    });
  }, [hydrateFromSeed]);

  const handleApply = useCallback(() => {
    const next = normalizeVaultProgressFromDebugInput({
      glimpse: parseIntLoose(glimpse, DEFAULT_VAULT_PROGRESS.attemptsLeft.glimpse),
      stare: parseIntLoose(stare, DEFAULT_VAULT_PROGRESS.attemptsLeft.stare),
      trance: parseIntLoose(trance, DEFAULT_VAULT_PROGRESS.attemptsLeft.trance),
      successfulMissions: parseIntLoose(successfulMissions, 0),
      lifetimeMissions: parseIntLoose(lifetimeMissions, 0),
      giftRotationIndex: parseIntLoose(giftRotationIndex, 0),
    });
    void onApply(next);
  }, [
    glimpse,
    stare,
    trance,
    successfulMissions,
    lifetimeMissions,
    giftRotationIndex,
    onApply,
  ]);

  const handleResetSave = useCallback(() => {
    void (async () => {
      await onResetToDefaults();
      onRequestClose();
    })();
  }, [onResetToDefaults, onRequestClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onRequestClose} />
          <View style={styles.cardOuter}>
            <View style={styles.card}>
          <Text style={styles.title}>DEBUG — Vault values</Text>
          <Text style={styles.hint}>
            Edit fields to test edge cases. Successful missions are clamped 0–{FREE_MISSION_CREDIT_ALLOWANCE}{' '}
            (matches cloud sync). Gift index: 0 = Trance, 1 = Stare, 2 = Glimpse (monthly rotation).
          </Text>
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Field label="Glimpse reserves" value={glimpse} onChangeText={setGlimpse} />
            <Field label="Stare reserves" value={stare} onChangeText={setStare} />
            <Field label="Trance reserves" value={trance} onChangeText={setTrance} />
            <Field
              label={`Successful missions (progress to free restoration, max ${FREE_MISSION_CREDIT_ALLOWANCE})`}
              value={successfulMissions}
              onChangeText={setSuccessfulMissions}
            />
            <Field label="Lifetime missions secured" value={lifetimeMissions} onChangeText={setLifetimeMissions} />
            <Field label="Gift rotation index (0–2)" value={giftRotationIndex} onChangeText={setGiftRotationIndex} />
          </ScrollView>
          <Pressable
            onPress={fillFormDefaults}
            disabled={busy}
            style={({ pressed }) => [styles.secondaryBtn, pressed && !busy && styles.secondaryBtnPressed]}>
            <Text style={styles.secondaryBtnText}>Load default values into fields</Text>
          </Pressable>
          <Pressable
            onPress={handleResetSave}
            disabled={busy}
            style={({ pressed }) => [styles.destructiveBtn, pressed && !busy && styles.destructiveBtnPressed]}>
            <Text style={styles.destructiveBtnText}>Reset vault to app defaults (save)</Text>
          </Pressable>
          <View style={styles.row}>
            <Pressable
              onPress={onRequestClose}
              disabled={busy}
              style={({ pressed }) => [styles.cancelBtn, pressed && !busy && styles.cancelBtnPressed]}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleApply}
              disabled={busy}
              style={({ pressed }) => [styles.applyBtn, pressed && !busy && styles.applyBtnPressed]}>
              <Text style={styles.applyBtnText}>{busy ? 'Saving…' : 'Apply'}</Text>
            </Pressable>
          </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        editable
        placeholder="0"
        placeholderTextColor="rgba(200,200,200,0.35)"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  cardOuter: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    maxHeight: '92%',
  },
  card: {
    maxHeight: '100%',
    backgroundColor: SV.gunmetal,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.35)',
    padding: 16,
  },
  title: {
    color: SV.surgicalWhite,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  hint: {
    color: 'rgba(240,240,240,0.75)',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  scroll: {
    maxHeight: 360,
    marginBottom: 10,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: SV.neonCyan,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.35)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  secondaryBtn: {
    paddingVertical: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  secondaryBtnPressed: {
    opacity: 0.85,
  },
  secondaryBtnText: {
    color: 'rgba(0,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  destructiveBtn: {
    paddingVertical: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  destructiveBtnPressed: {
    opacity: 0.85,
  },
  destructiveBtnText: {
    color: '#FF9A9A',
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  cancelBtnPressed: {
    opacity: 0.88,
  },
  cancelBtnText: {
    color: 'rgba(240,240,240,0.95)',
    fontSize: 15,
    fontWeight: '700',
  },
  applyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: SV.neonCyan,
    minWidth: 100,
    alignItems: 'center',
  },
  applyBtnPressed: {
    opacity: 0.9,
  },
  applyBtnText: {
    color: SV.black,
    fontSize: 15,
    fontWeight: '800',
  },
});
