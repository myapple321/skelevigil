import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { GlimpseBlockGrid } from '@/src/components/game/GlimpseBlockGrid';
import {
  GLIMPSE_HELP_HINT,
  GLIMPSE_HELP_SUMMARY,
} from '@/src/content/glimpsePhaseHelp';
import { buildGlimpseGreyPalette } from '@/src/game/glimpsePalette';
import { SV } from '@/src/theme/skelevigil';

const BRIEFING_INTRO =
  'Tap for a briefing on how to navigate the Hidden Path and secure the Strand.';

type PhaseInfoId = 'glimpse' | 'stare' | 'trance';

function BriefSection({ label, body }: { label: string; body: string }) {
  return (
    <View style={styles.modalSection}>
      <Text style={styles.modalSectionLabel}>{label}</Text>
      <Text style={styles.modalSectionBody}>{body}</Text>
    </View>
  );
}

function PhaseBriefingBody({ phase }: { phase: PhaseInfoId }) {
  return (
    <>
      <Text style={styles.modalIntro}>{BRIEFING_INTRO}</Text>
      {phase === 'glimpse' ? (
        <>
          <BriefSection label="Geometry" body="5×5 Square Grid." />
          <BriefSection
            label="Objective"
            body="Memorize the path, then excavate the 25 surrounding blocks."
          />
          <BriefSection label="Summary" body={GLIMPSE_HELP_SUMMARY} />
          <BriefSection label="Hint" body={GLIMPSE_HELP_HINT} />
        </>
      ) : null}
      {phase === 'stare' ? (
        <>
          <BriefSection label="Geometry" body="5×10 Diamond Grid." />
          <BriefSection
            label="Objective"
            body="Navigate 50 complex shapes in a high-saturation environment."
          />
          <BriefSection
            label="Summary"
            body="The grid has shifted to Diamonds. With 50 units to scan, your focus must remain steady. Uncover the empty space while keeping the Hidden Path untouched."
          />
        </>
      ) : null}
      {phase === 'trance' ? (
        <>
          <BriefSection label="Geometry" body="Dual-Plato Stacking (Two layers)." />
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionLabel}>Summary</Text>
            <Text style={styles.modalSectionBody}>
              You are now managing two planes of reality simultaneously. To secure the mission, you
              must navigate both layers:
            </Text>
            <Text style={[styles.modalSectionBody, styles.modalBullet]}>
              Top Plane: 50 Teal Diamonds.
            </Text>
            <Text style={[styles.modalSectionBody, styles.modalBullet]}>
              Bottom Plane: 50 Amber Hexagons.
            </Text>
          </View>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionLabel}>Hint</Text>
            <Text style={styles.modalSectionBody}>
              Carefully clear the surrounding tiles on both levels. The Immutable Strand now vibrates
              across two frequencies; if either plane is disturbed, the mission will end. Tap [Finish Excavation]
              once both architectures are secure.
            </Text>
          </View>
        </>
      ) : null}
    </>
  );
}

const ART_SIZE = 132;

/** Phase CTA fills — distinct from the default neon cyan tab chrome. */
const PHASE_BTN = {
  glimpseGrey: '#8A8E91',
  stareTeal: '#0E9595',
  tranceLightOrange: '#F5BF8A',
} as const;

function GlimpsePhasesPreview() {
  const colors = useMemo(() => buildGlimpseGreyPalette(), []);
  return <GlimpseBlockGrid colors={colors} size={ART_SIZE} />;
}

function PlaceholderArt() {
  return (
    <View style={[styles.artFrame, styles.placeholderArt]}>
      <View style={styles.placeholderInner} />
    </View>
  );
}

export default function PhasesScreen() {
  const router = useRouter();
  const [phaseInfoOpen, setPhaseInfoOpen] = useState<PhaseInfoId | null>(null);
  const infoModalVisible = phaseInfoOpen != null;
  const closeInfoModal = () => setPhaseInfoOpen(null);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeInfoModal}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeInfoModal}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
          <View style={styles.modalCard}>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator>
              {phaseInfoOpen ? <PhaseBriefingBody phase={phaseInfoOpen} /> : null}
            </ScrollView>
            <Pressable
              onPress={closeInfoModal}
              style={({ pressed }) => [
                styles.modalDismiss,
                pressed && styles.modalDismissPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="OK">
              <Text style={styles.modalDismissText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View
          style={styles.screenLeadWrap}
          accessibilityRole="text"
          accessibilityLabel="Art of the Immutable. Choose where you'd like to begin. Then tap Play now.">
          <Text style={styles.screenLeadTagline}>Art of the Immutable</Text>
          <Text style={[styles.screenLeadLine, styles.screenLeadFromTitle]}>
            Choose where you’d like to begin,
          </Text>
          <Text style={[styles.screenLeadLine, styles.screenLeadStacked]}>
            Then tap Play now.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.levelTitle}>The Glimpse</Text>
          <View style={styles.row}>
            <GlimpsePhasesPreview />
            <View style={styles.actionColumn}>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => setPhaseInfoOpen('glimpse')}
                  style={({ pressed }) => [
                    styles.infoIconBtn,
                    pressed && styles.infoIconBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Level information, The Glimpse">
                  <Ionicons
                    name="information-circle-outline"
                    size={26}
                    color={SV.neonCyan}
                  />
                </Pressable>
                <Pressable
                  onPress={() => router.push('/(main)/vigil')}
                  style={({ pressed }) => [
                    styles.playBtn,
                    styles.playBtnFlex,
                    styles.playBtnGlimpse,
                    pressed && styles.playBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Play The Glimpse">
                  <Text style={styles.playBtnText}>Play now</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.levelTitle}>The Stare</Text>
          <View style={styles.row}>
            <PlaceholderArt />
            <View style={styles.actionColumn}>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => setPhaseInfoOpen('stare')}
                  style={({ pressed }) => [
                    styles.infoIconBtn,
                    pressed && styles.infoIconBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Level information, The Stare">
                  <Ionicons
                    name="information-circle-outline"
                    size={26}
                    color={SV.neonCyan}
                  />
                </Pressable>
                <Pressable
                  onPress={() => {}}
                  style={({ pressed }) => [
                    styles.playBtn,
                    styles.playBtnFlex,
                    styles.playBtnStare,
                    pressed && styles.playBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Play The Stare">
                  <Text style={styles.playBtnText}>Play now</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.levelTitle}>The Trance</Text>
          <View style={styles.row}>
            <PlaceholderArt />
            <View style={styles.actionColumn}>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => setPhaseInfoOpen('trance')}
                  style={({ pressed }) => [
                    styles.infoIconBtn,
                    pressed && styles.infoIconBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Level information, The Trance">
                  <Ionicons
                    name="information-circle-outline"
                    size={26}
                    color={SV.neonCyan}
                  />
                </Pressable>
                <Pressable
                  onPress={() => {}}
                  style={({ pressed }) => [
                    styles.playBtn,
                    styles.playBtnFlex,
                    styles.playBtnTrance,
                    pressed && styles.playBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Play The Trance">
                  <Text style={styles.playBtnText}>Play now</Text>
                </Pressable>
              </View>
            </View>
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
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  screenLeadWrap: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  screenLeadLine: {
    color: SV.neonCyan,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
  screenLeadFromTitle: {
    marginTop: 4,
  },
  screenLeadStacked: {
    marginTop: 2,
  },
  screenLeadTagline: {
    color: SV.neonCyan,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 19,
  },
  section: {
    marginBottom: 28,
  },
  levelTitle: {
    color: SV.surgicalWhite,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  artFrame: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 6,
    overflow: 'hidden',
  },
  placeholderArt: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(136,136,136,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderInner: {
    width: '72%',
    height: '72%',
    backgroundColor: '#FAFAFA',
  },
  actionColumn: {
    flex: 1,
    justifyContent: 'center',
    minHeight: ART_SIZE,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnFlex: {
    flex: 1,
    minWidth: 0,
  },
  infoIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIconBtnPressed: {
    opacity: 0.75,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '82%',
    backgroundColor: SV.gunmetal,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.25)',
  },
  modalScroll: {
    maxHeight: 420,
    marginBottom: 16,
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  modalIntro: {
    color: SV.surgicalWhite,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: 14,
  },
  modalSectionLabel: {
    color: SV.neonCyan,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  modalSectionBody: {
    color: SV.surgicalWhite,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'left',
  },
  modalBullet: {
    marginTop: 8,
    paddingLeft: 8,
  },
  modalDismiss: {
    alignSelf: 'center',
    backgroundColor: SV.neonCyan,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  modalDismissPressed: {
    opacity: 0.88,
  },
  modalDismissText: {
    color: SV.black,
    fontSize: 15,
    fontWeight: '600',
  },
  playBtnGlimpse: {
    backgroundColor: PHASE_BTN.glimpseGrey,
  },
  playBtnStare: {
    backgroundColor: PHASE_BTN.stareTeal,
  },
  playBtnTrance: {
    backgroundColor: PHASE_BTN.tranceLightOrange,
  },
  playBtnPressed: {
    opacity: 0.88,
  },
  playBtnText: {
    color: SV.black,
    fontSize: 16,
    fontWeight: '600',
  },
});
