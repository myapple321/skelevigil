import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { GlimpseBlockGrid } from '@/src/components/game/GlimpseBlockGrid';
import { StareDiamondPlayBox } from '@/src/components/game/StareDiamondPlayBox';
import { buildGlimpseGreyPalette } from '@/src/game/glimpsePalette';
import { PHASE_ACCENTS } from '@/src/theme/phaseAccents';
import { SV } from '@/src/theme/skelevigil';

type PhaseInfoId = 'glimpse' | 'stare' | 'trance';

const PHASE_FIELD_MANUAL_TITLE: Record<PhaseInfoId, string> = {
  glimpse: 'The Glimpse - Field Manual',
  stare: 'The Stare - Field Manual',
  trance: 'The Trance - Field Manual',
};

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
      <Text style={styles.modalTitle}>{PHASE_FIELD_MANUAL_TITLE[phase]}</Text>
      {phase === 'glimpse' ? (
        <>
          <BriefSection label="The Geometry" body="5x5 Square Grid." />
          <BriefSection
            label="The Objective"
            body="Successfully excavate the neutral blocks positioned around the main neural strands."
          />
          <BriefSection
            label="The Hazard"
            body="Do NOT touch the Neural Strands themselves. Contact will result in a Shattered Strand failure."
          />
          <BriefSection
            label="Validation"
            body='Once the surrounding excavation is complete, tap "Finish Excavation" to scan. If the strands are untouched, the mission is Secured.'
          />
        </>
      ) : null}
      {phase === 'stare' ? (
        <>
          <BriefSection label="The Geometry" body="5x7 Diamond Grid." />
          <BriefSection
            label="The Objective"
            body="Successfully excavate the neutral blocks positioned around the main neural strands."
          />
          <BriefSection
            label="The Hazard"
            body="Do NOT touch the Neural Strands themselves. Contact will result in a Shattered Strand failure."
          />
          <BriefSection
            label="Validation"
            body='Once the surrounding excavation is complete, tap "Finish Excavation" to scan. If the strands are untouched, the mission is Secured.'
          />
        </>
      ) : null}
      {phase === 'trance' ? (
        <>
          <BriefSection
            label="The Geometry"
            body="Dual-Plato Stacking (Two layers), 5x7 Diamond Bottom Grid and 5x7 Hexagon Top Grid."
          />
          <BriefSection
            label="The Observation"
            body="You have 5 seconds per plane (Diamond and Hexagon) to memorize the locations of the Neural Nexus blocks."
          />
          <BriefSection
            label="The Objective"
            body="You must manually excavate all identified Nexus blocks across both planes within the 70-second window."
          />
          <BriefSection
            label="The Pivot"
            body="Use the shared Nexus blocks to transition your focus between the two geometric layers."
          />
          <BriefSection
            label="Validation"
            body='Tap "Finish Excavation" once all target nodes are cleared to scan for mission completion.'
          />
        </>
      ) : null}
    </>
  );
}

const ART_SIZE = 132;
/** Stare board outer width so 5:7 aspect height fits the square art tile (7 rows × 5 cols). */
const STARE_PHASE_PREVIEW_BOARD_W = Math.round((ART_SIZE * 5) / 7);

/** Phase CTA fills — distinct from the default neon cyan tab chrome. */
const PHASE_BTN = {
  glimpseGrey: PHASE_ACCENTS.glimpse.primary,
  stareTeal: PHASE_ACCENTS.stare.primary,
  tranceLightOrange: PHASE_ACCENTS.trance.primary,
} as const;

function GlimpsePhasesPreview() {
  const colors = useMemo(() => buildGlimpseGreyPalette(), []);
  return <GlimpseBlockGrid colors={colors} size={ART_SIZE} />;
}

/** Live 7×5 diamond lattice (same as Vigil) inside the Phases art tile. */
function StarePhasePreview() {
  return (
    <View
      style={[styles.artFrame, styles.phasePreviewArtFrame, styles.starePhasePreviewRoot]}
      accessibilityRole="image"
      accessibilityLabel="Cyan diamond pattern preview for The Stare phase">
      <StareDiamondPlayBox
        borderColor={PHASE_ACCENTS.stare.primary}
        previewWidth={STARE_PHASE_PREVIEW_BOARD_W}
      />
    </View>
  );
}

/** Vigil Trance memorize capture (screenshot #2) — overlaid and shifted down over the Stare diamond. */
const TRANCE_MEMORY_HEX_ART = require('../../assets/phase-trance-memory-hex-vigil.png');

/**
 * Dual-plane preview: full Stare diamond (same as Phases / screenshot #1) with the Vigil memory hex
 * raster slid down so it covers the lower diamond field.
 */
function TrancePhasePreview() {
  return (
    <View
      style={[styles.artFrame, styles.phasePreviewArtFrame, styles.trancePhasePreviewRoot]}
      accessibilityRole="image"
      accessibilityLabel="Dual-plane Trance preview: Stare diamond base with hex memory layer shifted down over it">
      <View style={styles.tranceDualPlaneColumn}>
        <View style={[styles.tranceDualPlaneLayer, styles.tranceDiamondPlaneRoot]}>
          <StareDiamondPlayBox
            borderColor={PHASE_ACCENTS.stare.primary}
            previewWidth={STARE_PHASE_PREVIEW_BOARD_W}
          />
        </View>
        <Image
          source={TRANCE_MEMORY_HEX_ART}
          style={[styles.tranceDualPlaneLayer, styles.tranceHexMemoryOverlay]}
          resizeMode="cover"
        />
      </View>
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
                  onPress={() => router.push('/(main)/vigil?phase=glimpse')}
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
            <StarePhasePreview />
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
                  onPress={() => router.push('/(main)/vigil?phase=stare')}
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
            <TrancePhasePreview />
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
                  onPress={() => router.push('/(main)/vigil?phase=trance')}
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
  phasePreviewArtFrame: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(136,136,136,0.45)',
  },
  starePhasePreviewRoot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  trancePhasePreviewRoot: {
    overflow: 'hidden',
  },
  tranceDualPlaneColumn: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: ART_SIZE,
    height: ART_SIZE,
    overflow: 'hidden',
  },
  tranceDualPlaneLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: ART_SIZE,
  },
  tranceDiamondPlaneRoot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** Screenshot #2: translateY pulls the hex plate down over the bottom of the diamond lattice. */
  tranceHexMemoryOverlay: {
    transform: [{ translateY: ART_SIZE / 3 }],
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
  modalTitle: {
    color: SV.surgicalWhite,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '700',
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
