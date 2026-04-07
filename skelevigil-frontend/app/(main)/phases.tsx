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

import { SV } from '@/src/theme/skelevigil';

const INFO_SOON_MESSAGE = 'The information will be available soon.';

const ART_SIZE = 132;
const GRID_INSET = 8;
const CELL_GAP = 3;

/** Phase CTA fills — distinct from the default neon cyan tab chrome. */
const PHASE_BTN = {
  glimpseGrey: '#8A8E91',
  stareTeal: '#0E9595',
  tranceLightOrange: '#F5BF8A',
} as const;

/** 25 evenly spaced grey steps (light → dark) for the 5×5 “Glimpse” grid. */
function useGlimpseGreys(): string[] {
  return useMemo(() => {
    const light = 244;
    const dark = 62;
    return Array.from({ length: 25 }, (_, i) => {
      const t = i / 24;
      const v = Math.round(light + (dark - light) * t);
      return `rgb(${v},${v},${v})`;
    });
  }, []);
}

function GlimpseGridArt() {
  const greys = useGlimpseGreys();
  return (
    <View style={styles.artFrame}>
      <View style={styles.glimpseMat}>
        <View style={styles.glimpseGrid}>
          {[0, 1, 2, 3, 4].map((row) => (
            <View key={row} style={styles.glimpseRow}>
              {[0, 1, 2, 3, 4].map((col) => {
                const idx = row * 5 + col;
                return (
                  <View
                    key={col}
                    style={[
                      styles.glimpseCell,
                      { backgroundColor: greys[idx] ?? SV.muted },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function PlaceholderArt() {
  return (
    <View style={[styles.artFrame, styles.placeholderArt]}>
      <View style={styles.placeholderInner} />
    </View>
  );
}

export default function PhasesScreen() {
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setInfoModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalMessage}>{INFO_SOON_MESSAGE}</Text>
            <Pressable
              onPress={() => setInfoModalVisible(false)}
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
            <GlimpseGridArt />
            <View style={styles.actionColumn}>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => {}}
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
                <Pressable
                  onPress={() => setInfoModalVisible(true)}
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
                <Pressable
                  onPress={() => setInfoModalVisible(true)}
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
                <Pressable
                  onPress={() => setInfoModalVisible(true)}
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
  glimpseMat: {
    flex: 1,
    backgroundColor: '#EFEFEF',
    padding: GRID_INSET,
  },
  glimpseGrid: {
    flex: 1,
    gap: CELL_GAP,
  },
  glimpseRow: {
    flex: 1,
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  glimpseCell: {
    flex: 1,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 1.5,
    elevation: 1,
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
    backgroundColor: SV.gunmetal,
    borderRadius: 12,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.25)',
  },
  modalMessage: {
    color: SV.surgicalWhite,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
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
