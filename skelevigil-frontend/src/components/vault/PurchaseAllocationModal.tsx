/**
 * Purchase allocation UI: choose Glimpse / Stare / Trance before RevenueCat IAP.
 * Guest mode shows "Link Account Required" instead of phase buttons (see product copy).
 */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { VaultAttemptsLeft } from '@/src/preferences/vaultProgress';
import { PHASE_ACCENTS } from '@/src/theme/phaseAccents';
import { SV } from '@/src/theme/skelevigil';

export type VaultPhaseTier = keyof VaultAttemptsLeft;

const PHASE_ORDER: VaultPhaseTier[] = ['glimpse', 'stare', 'trance'];

/** Border + fill tints: Glimpse grey, Stare teal, Trance amber (matches phase accents). */
const PHASE_ALLOCATION_BTN: Record<
  VaultPhaseTier,
  { borderColor: string; backgroundColor: string; backgroundPressed: string }
> = {
  glimpse: {
    borderColor: PHASE_ACCENTS.glimpse.primary,
    backgroundColor: 'rgba(138, 142, 145, 0.14)',
    backgroundPressed: 'rgba(138, 142, 145, 0.26)',
  },
  stare: {
    borderColor: PHASE_ACCENTS.stare.primary,
    backgroundColor: 'rgba(14, 149, 149, 0.14)',
    backgroundPressed: 'rgba(14, 149, 149, 0.28)',
  },
  trance: {
    borderColor: PHASE_ACCENTS.trance.primary,
    backgroundColor: 'rgba(245, 191, 138, 0.12)',
    backgroundPressed: 'rgba(245, 191, 138, 0.24)',
  },
};

const PHASE_LABEL: Record<VaultPhaseTier, string> = {
  glimpse: 'Glimpse',
  stare: 'Stare',
  trance: 'Trance',
};

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  /** When true, hide allocation buttons and show link-account messaging. */
  isGuest: boolean;
  attemptsLeft: VaultAttemptsLeft;
  onSelectPhase: (tier: VaultPhaseTier) => void;
  onLinkAccount: () => void;
};

export function PurchaseAllocationModal({
  visible,
  onRequestClose,
  isGuest,
  attemptsLeft,
  onSelectPhase,
  onLinkAccount,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={onRequestClose}
          accessibilityLabel="Dismiss purchase allocation"
        />
        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>Purchase Allocation</Text>
          <Text style={styles.subtitle}>
            Choose which phase receives the 3 Vault Credits after payment completes.
          </Text>

          {isGuest ? (
            <>
              <Text style={styles.guestTitle}>Link Account Required</Text>
              <Text style={styles.guestBody}>
                Guest accounts cannot purchase Vault Credits. Log in with Email, Apple, or Google to
                continue.
              </Text>
              <Pressable
                onPress={() => {
                  onRequestClose();
                  onLinkAccount();
                }}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}>
                <Text style={styles.primaryBtnText}>Go to Login</Text>
              </Pressable>
            </>
          ) : (
            <>
              {PHASE_ORDER.map((tier) => {
                const count = attemptsLeft[tier];
                const pal = PHASE_ALLOCATION_BTN[tier];
                return (
                  <Pressable
                    key={tier}
                    onPress={() => onSelectPhase(tier)}
                    style={({ pressed }) => [
                      styles.phaseBtn,
                      {
                        borderColor: pal.borderColor,
                        backgroundColor: pressed ? pal.backgroundPressed : pal.backgroundColor,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Add to ${PHASE_LABEL[tier]}, current reserves ${count}`}>
                    <Text style={styles.phaseBtnText}>
                      Add to {PHASE_LABEL[tier]} — {count} reserved
                    </Text>
                  </Pressable>
                );
              })}
            </>
          )}

          <Pressable
            onPress={onRequestClose}
            style={({ pressed }) => [styles.cancelWrap, pressed && styles.cancelPressed]}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    zIndex: 1,
    backgroundColor: '#0a0f12',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: SV.neonCyan,
    padding: 20,
    gap: 14,
  },
  title: {
    color: SV.neonCyan,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(240,240,240,0.88)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  guestTitle: {
    color: SV.surgicalWhite,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  guestBody: {
    color: 'rgba(240,240,240,0.9)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: SV.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryBtnPressed: {
    opacity: 0.9,
  },
  primaryBtnText: {
    color: SV.black,
    fontSize: 17,
    fontWeight: '800',
  },
  phaseBtn: {
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  phaseBtnText: {
    color: SV.surgicalWhite,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  cancelWrap: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelPressed: {
    opacity: 0.85,
  },
  cancelText: {
    color: SV.muted,
    fontSize: 16,
    fontWeight: '600',
  },
});
