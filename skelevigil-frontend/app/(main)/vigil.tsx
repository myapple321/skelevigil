import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GLIMPSE_CELL_GAP,
  GLIMPSE_GRID_INSET,
  GLIMPSE_PREVIEW_SIZE,
} from '@/src/components/game/GlimpseBlockGrid';
import { playTileFailSfx } from '@/src/audio/tileFailSfx';
import { playTileRevealSfx } from '@/src/audio/tileRevealSfx';
import { GlimpseRevealBoard } from '@/src/components/game/GlimpseRevealBoard';
import { GLIMPSE_HELP_HINT, GLIMPSE_HELP_SUMMARY } from '@/src/content/glimpsePhaseHelp';
import { useSfxPreference } from '@/src/contexts/SfxPreferenceContext';
import { useVaultProgress } from '@/src/contexts/VaultProgressContext';
import { shuffledGlimpseGreyPalette } from '@/src/game/glimpsePalette';
import { generateRandomNeuralBlocks, neuralBlockToTileIndex } from '@/src/game/neuralBlocks';
import type { VaultAttemptsLeft } from '@/src/preferences/vaultProgress';
import { SV } from '@/src/theme/skelevigil';

const MEMORIZE_MS = 5000;
const SCAN_MS = 2000;
const PLAY_TIME_SEC = 25;
const TIMEOUT_AMBER = '#FFBF00';

/** Vigil currently implements The Glimpse only — reserves use the Glimpse tier. */
const VIGIL_VAULT_PHASE: keyof VaultAttemptsLeft = 'glimpse';

/**
 * Restored when the mission-success modal closes. Must include `display: 'flex'` so the bar
 * becomes interactive again after `display: 'none'` (React Navigation can merge styles and leave
 * `none` applied otherwise).
 */
const MAIN_TAB_BAR_STYLE = {
  display: 'flex' as const,
  backgroundColor: SV.abyss,
  borderTopColor: 'rgba(0,255,255,0.2)',
} as const;

/**
 * Set when the Vigil tab blurs; consumed on next focus to enter `paused` (survives screen remount).
 */
let vigilPausedAfterNextTabFocus = false;

export default function VigilScreen() {
  const navigation = useNavigation();
  const { sfxEnabled } = useSfxPreference();
  const {
    progress,
    recordGlimpseFailure,
    recordGlimpseSuccess,
    deductGlimpseAttempt,
  } = useVaultProgress();
  const { width } = useWindowDimensions();
  const gridSize = Math.min(Math.max(width - 40, 220), 360);
  const scale = gridSize / GLIMPSE_PREVIEW_SIZE;
  const matPadding = Math.max(6, Math.round(GLIMPSE_GRID_INSET * scale));
  const cellGap = Math.max(2, Math.round(GLIMPSE_CELL_GAP * scale));

  const [neuralBlocks, setNeuralBlocks] = useState(() => generateRandomNeuralBlocks());
  /** Start idle until the first New Mission (no auto-memorize on first land). */
  const [phase, setPhase] = useState<'memorize' | 'play' | 'paused'>('paused');
  const [memorizeSecondsLeft, setMemorizeSecondsLeft] = useState(5);
  const [failedIndex, setFailedIndex] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [playSecondsLeft, setPlaySecondsLeft] = useState(PLAY_TIME_SEC);
  const [scanProgress, setScanProgress] = useState<number | null>(null);
  const [finishPulse, setFinishPulse] = useState(false);
  const [successPulseToken, setSuccessPulseToken] = useState(0);
  const [reservesEmptyModalVisible, setReservesEmptyModalVisible] = useState(false);
  const [missionSuccessModalVisible, setMissionSuccessModalVisible] = useState(false);
  /** After a won round: stay on solved grid until the user taps New Mission (no auto-shuffle on Continue). */
  const [awaitingNewMissionAfterSuccess, setAwaitingNewMissionAfterSuccess] = useState(false);
  /**
   * True after New Mission starts a round until success/failure ends it — allows playing at 0 reserves
   * until the round finishes (last credit was already spent on this sortie).
   */
  const [hasActiveRound, setHasActiveRound] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);

  const missionSuccessOpenRef = useRef(missionSuccessModalVisible);
  const awaitingWinStandbyRef = useRef(awaitingNewMissionAfterSuccess);
  missionSuccessOpenRef.current = missionSuccessModalVisible;
  awaitingWinStandbyRef.current = awaitingNewMissionAfterSuccess;

  const [gridColors, setGridColors] = useState(() => shuffledGlimpseGreyPalette());
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    Array.from({ length: 25 }, () => false),
  );
  const revealedRef = useRef(revealed);
  revealedRef.current = revealed;
  const finishScanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const memorizeTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const memorizeDoneRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True after the user has started at least one sortie (New Mission); used for paused hint copy. */
  const hasBegunSortieRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const timedOutRef = useRef(timedOut);
  const outcomeCommittedRef = useRef(false);
  /** After a failed round, the next New Mission does not debit again (failure already consumed a reserve). */
  const lastRoundConsumedReserveRef = useRef(false);
  /** This grid was paid for via New Mission debit; failure should not also call recordGlimpseFailure. */
  const paidForCurrentRoundRef = useRef(false);
  timedOutRef.current = timedOut;

  const glimpseReserves = progress.attemptsLeft[VIGIL_VAULT_PHASE];
  const glimpseLocked = glimpseReserves <= 0 && !hasActiveRound;

  const neuralTileSetForUi = useMemo(
    () => new Set(neuralBlocks.map(neuralBlockToTileIndex)),
    [neuralBlocks],
  );
  const hasRevealedSafeTile = useMemo(
    () => revealed.some((isRev, idx) => isRev && !neuralTileSetForUi.has(idx)),
    [revealed, neuralTileSetForUi],
  );

  const applyNewGridShuffle = useCallback(() => {
    outcomeCommittedRef.current = false;
    setPhase('memorize');
    setMemorizeSecondsLeft(5);
    setNeuralBlocks(generateRandomNeuralBlocks());
    setGridColors(shuffledGlimpseGreyPalette());
    setFailedIndex(null);
    setTimedOut(false);
    setScanProgress(null);
    if (finishScanTimerRef.current) {
      clearInterval(finishScanTimerRef.current);
      finishScanTimerRef.current = null;
    }
    setFinishPulse(false);
    setAwaitingNewMissionAfterSuccess(false);
    hasBegunSortieRef.current = true;
    const fresh = Array.from({ length: 25 }, () => false);
    revealedRef.current = fresh;
    setRevealed(fresh);
  }, []);

  const onDismissMissionSuccess = useCallback(() => {
    setMissionSuccessModalVisible(false);
  }, []);

  useLayoutEffect(() => {
    const tabNav = navigation.getParent();
    if (!tabNav) return;

    const showTabBar = () => {
      tabNav.setOptions({
        tabBarStyle: { ...MAIN_TAB_BAR_STYLE },
      });
    };
    const hideTabBar = () => {
      tabNav.setOptions({
        tabBarStyle: { display: 'none' },
      });
    };

    if (missionSuccessModalVisible) {
      hideTabBar();
    } else {
      showTabBar();
    }
    return () => {
      showTabBar();
    };
  }, [missionSuccessModalVisible, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (vigilPausedAfterNextTabFocus) {
        vigilPausedAfterNextTabFocus = false;
        if (!missionSuccessOpenRef.current && !awaitingWinStandbyRef.current) {
          if (memorizeTickRef.current) {
            clearInterval(memorizeTickRef.current);
            memorizeTickRef.current = null;
          }
          if (memorizeDoneRef.current) {
            clearTimeout(memorizeDoneRef.current);
            memorizeDoneRef.current = null;
          }
          setPhase('paused');
          setScanProgress(null);
          if (finishScanTimerRef.current) {
            clearInterval(finishScanTimerRef.current);
            finishScanTimerRef.current = null;
          }
        }
      }
      return () => {
        vigilPausedAfterNextTabFocus = true;
      };
    }, []),
  );

  const commitMissionSuccess = () => {
    if (outcomeCommittedRef.current) return;
    outcomeCommittedRef.current = true;
    paidForCurrentRoundRef.current = false;
    setHasActiveRound(false);
    recordGlimpseSuccess();
  };

  const commitMissionFailure = () => {
    if (outcomeCommittedRef.current) return;
    outcomeCommittedRef.current = true;
    setHasActiveRound(false);
    lastRoundConsumedReserveRef.current = true;
    if (paidForCurrentRoundRef.current) {
      paidForCurrentRoundRef.current = false;
    } else {
      recordGlimpseFailure();
    }
  };

  useEffect(() => {
    if (glimpseLocked) {
      outcomeCommittedRef.current = false;
      setPhase('play');
      setMemorizeSecondsLeft(0);
      setFailedIndex(null);
      setTimedOut(false);
      setPlaySecondsLeft(PLAY_TIME_SEC);
      return;
    }
    // Do not depend on `phase` here: when memorize ends and sets phase to 'play', re-running would
    // restart memorize in an infinite loop. Read latest phase via ref for guards only.
    if (phaseRef.current === 'paused') return;
    if (awaitingNewMissionAfterSuccess) return;

    outcomeCommittedRef.current = false;
    setPhase('memorize');
    setMemorizeSecondsLeft(5);
    setFailedIndex(null);
    setTimedOut(false);
    const tick = setInterval(() => {
      setMemorizeSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    memorizeTickRef.current = tick;
    const done = setTimeout(() => {
      clearInterval(tick);
      memorizeTickRef.current = null;
      memorizeDoneRef.current = null;
      setPhase('play');
    }, MEMORIZE_MS);
    memorizeDoneRef.current = done;
    return () => {
      clearInterval(tick);
      clearTimeout(done);
      memorizeTickRef.current = null;
      memorizeDoneRef.current = null;
    };
  }, [neuralBlocks, glimpseLocked, awaitingNewMissionAfterSuccess]);

  useEffect(() => {
    if (glimpseLocked) return;
    if (phase !== 'play') return;
    if (awaitingNewMissionAfterSuccess) return;
    if (failedIndex != null || timedOut) return;

    setPlaySecondsLeft(PLAY_TIME_SEC);
    const id = setInterval(() => {
      setPlaySecondsLeft((s) => {
        if (s <= 1) {
          if (finishScanTimerRef.current) {
            clearInterval(finishScanTimerRef.current);
            finishScanTimerRef.current = null;
          }
          setScanProgress(null);
          setTimedOut(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, neuralBlocks, failedIndex, timedOut, glimpseLocked, awaitingNewMissionAfterSuccess]);

  useEffect(() => {
    if (!timedOut) return;
    commitMissionFailure();
  }, [timedOut]);

  const onNewMission = () => {
    const skipDebit = lastRoundConsumedReserveRef.current;
    if (glimpseReserves <= 0 && !skipDebit) {
      setReservesEmptyModalVisible(true);
      return;
    }
    // Before deduct: local `deductGlimpseAttempt` updates reserves synchronously; without this,
    // one render can see 0 reserves and !hasActiveRound → glimpseLocked and the locked-branch effect.
    setHasActiveRound(true);
    lastRoundConsumedReserveRef.current = false;
    if (!skipDebit) {
      deductGlimpseAttempt();
    }
    paidForCurrentRoundRef.current = !skipDebit;
    applyNewGridShuffle();
  };

  const onRevealCell = (index: number) => {
    if (glimpseLocked) return;
    if (phase !== 'play') return;
    if (awaitingNewMissionAfterSuccess) return;
    if (failedIndex != null || timedOut) return;
    if (revealedRef.current[index]) return;

    const neuralTileSet = new Set(neuralBlocks.map(neuralBlockToTileIndex));
    if (neuralTileSet.has(index)) {
      setFailedIndex(index);
      setTimedOut(false);
      commitMissionFailure();
      if (sfxEnabled) void playTileFailSfx();
      return;
    }

    if (sfxEnabled) void playTileRevealSfx();
    setRevealed((prev) => {
      if (prev[index]) return prev;
      const next = [...prev];
      next[index] = true;
      revealedRef.current = next;
      return next;
    });
  };

  const onOpenFinishHelp = () => {
    setInfoModal({ title: 'Summary', body: GLIMPSE_HELP_SUMMARY });
  };

  const onOpenNewGameHelp = () => {
    setInfoModal({ title: 'Hint', body: GLIMPSE_HELP_HINT });
  };

  const onFinishExcavation = () => {
    if (glimpseLocked) return;
    if (phase !== 'play') return;
    if (awaitingNewMissionAfterSuccess) return;
    if (outcomeCommittedRef.current) return;
    if (failedIndex != null || timedOut) return;
    if (scanProgress != null) return;
    if (!hasRevealedSafeTile) return;

    setFinishPulse(true);
    setTimeout(() => setFinishPulse(false), 220);

    const neuralTileSet = new Set(neuralBlocks.map(neuralBlockToTileIndex));
    setScanProgress(0);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.min(1, elapsed / SCAN_MS);
      setScanProgress(next);
      if (next >= 1) {
        clearInterval(timer);
        finishScanTimerRef.current = null;
        setScanProgress(null);

        const current = revealedRef.current;
        const safeTilesAllRevealed = current.every((isRevealed, idx) =>
          neuralTileSet.has(idx) ? true : isRevealed,
        );
        const neuralTileTouched = current.some((isRevealed, idx) =>
          neuralTileSet.has(idx) ? isRevealed : false,
        );
        const success =
          safeTilesAllRevealed &&
          !neuralTileTouched &&
          failedIndex == null &&
          !timedOutRef.current;

        if (success) {
          commitMissionSuccess();
          const fullyRevealed = Array.from({ length: 25 }, () => true);
          revealedRef.current = fullyRevealed;
          setRevealed(fullyRevealed);
          setSuccessPulseToken((n) => n + 1);
          setAwaitingNewMissionAfterSuccess(true);
          setMissionSuccessModalVisible(true);
          return;
        }

        const firstNeuralIdx = neuralBlocks.length > 0 ? neuralBlockToTileIndex(neuralBlocks[0]!) : 0;
        setFailedIndex(firstNeuralIdx);
        setTimedOut(false);
        commitMissionFailure();
        if (sfxEnabled) void playTileFailSfx();
      }
    }, 16);
    finishScanTimerRef.current = timer;
  };

  const finishDisabled =
    glimpseLocked ||
    phase !== 'play' ||
    awaitingNewMissionAfterSuccess ||
    failedIndex != null ||
    timedOut ||
    scanProgress != null ||
    !hasRevealedSafeTile;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Modal
        visible={missionSuccessModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}>
        <View
          style={styles.modalBackdrop}
          accessibilityViewIsModal
          importantForAccessibility="yes">
          <View style={styles.successModalCard}>
            <Text style={styles.successModalEyebrow}>Mission Complete</Text>
            <Text style={styles.successModalTitle}>Excavation Secured</Text>
            <Text style={styles.successModalBody}>
              The Hidden Path is clear and the Strand remains intact. Your success has been logged to
              the Vault.
            </Text>
            <Pressable
              onPress={onDismissMissionSuccess}
              style={({ pressed }) => [
                styles.modalPrimary,
                pressed && styles.modalPrimaryPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue">
              <Text style={styles.modalPrimaryText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={reservesEmptyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReservesEmptyModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setReservesEmptyModalVisible(false)}
            accessibilityLabel="Dismiss"
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Mission Reserves Empty</Text>
            <Text style={styles.modalBody}>
              Please visit the Vault to restore your connection.
            </Text>
            <Pressable
              onPress={() => {
                setReservesEmptyModalVisible(false);
                router.push('/(main)/vault');
              }}
              style={({ pressed }) => [styles.modalPrimary, pressed && styles.modalPrimaryPressed]}>
              <Text style={styles.modalPrimaryText}>Open Vault</Text>
            </Pressable>
            <Pressable
              onPress={() => setReservesEmptyModalVisible(false)}
              style={({ pressed }) => [styles.modalSecondary, pressed && styles.modalSecondaryPressed]}>
              <Text style={styles.modalSecondaryText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={infoModal != null}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModal(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setInfoModal(null)}
            accessibilityLabel="Dismiss"
          />
          <View style={styles.modalCard}>
            {infoModal ? (
              <>
                <Text style={styles.modalSectionLabel}>{infoModal.title}</Text>
                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator>
                  <Text style={styles.modalBodyLeft}>{infoModal.body}</Text>
                </ScrollView>
              </>
            ) : null}
            <Pressable
              onPress={() => setInfoModal(null)}
              style={({ pressed }) => [styles.modalPrimary, pressed && styles.modalPrimaryPressed]}>
              <Text style={styles.modalPrimaryText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, phase === 'play' && styles.titlePlaySpacing]}>The Glimpse</Text>
        {glimpseLocked ? (
          <Text style={styles.lockedHint} accessibilityLiveRegion="polite">
            Glimpse attempts are depleted. Buy 3 Vault Credits to continue this mission.
          </Text>
        ) : phase === 'memorize' ? (
          <Text style={styles.memorizeHint} accessibilityLiveRegion="polite">
            Memorize the neural blocks. Tiles return in {memorizeSecondsLeft}s.
          </Text>
        ) : phase === 'paused' ? (
          <Text style={styles.tabReturnHint} accessibilityLiveRegion="polite">
            {hasBegunSortieRef.current
              ? "Session paused. Tap 'New Mission' when you are ready to continue."
              : "Mission grid is idle. Tap 'New Mission' to deploy your first sortie."}
          </Text>
        ) : awaitingNewMissionAfterSuccess ? (
          <Text style={styles.successStandbyHint} accessibilityLiveRegion="polite">
            Excavation secured. Tap &apos;New Mission&apos; when you are ready for the next sortie.
          </Text>
        ) : timedOut ? (
          <Text style={styles.timeoutHint} accessibilityLiveRegion="polite">
            The excavation has collapsed. Tap &apos;New Mission&apos; to attempt a re-sync.
          </Text>
        ) : failedIndex != null ? (
          <Text style={styles.failHint} accessibilityLiveRegion="polite">
            The Strand has shattered. Tap &apos;New Mission&apos; to start again.
          </Text>
        ) : phase === 'play' ? (
          <View
            style={styles.excavationBarWrap}
            accessibilityLabel={`Excavation time, ${playSecondsLeft} seconds remaining`}
            accessibilityLiveRegion="polite">
            <View style={styles.excavationBarTrack}>
              <View
                style={[
                  styles.excavationBarFill,
                  { width: `${(playSecondsLeft / PLAY_TIME_SEC) * 100}%` },
                ]}
              />
            </View>
          </View>
        ) : null}
        <View style={styles.gridWrap}>
          <GlimpseRevealBoard
            colors={gridColors}
            neuralBlocks={neuralBlocks}
            showTiles={phase === 'play'}
            failedIndex={failedIndex}
            timedOut={timedOut}
            excavationPressureFraction={
              phase === 'play' &&
              failedIndex == null &&
              !awaitingNewMissionAfterSuccess
                ? timedOut
                  ? 1
                  : (PLAY_TIME_SEC - playSecondsLeft) / PLAY_TIME_SEC
                : null
            }
            scanProgress={scanProgress}
            successPulseToken={successPulseToken}
            size={gridSize}
            matPadding={matPadding}
            cellGap={cellGap}
            revealed={revealed}
            onRevealCell={onRevealCell}
          />
        </View>
        <View style={styles.newGameRow}>
          <Pressable
            onPress={onOpenNewGameHelp}
            style={({ pressed }) => [styles.newGameInfoBtn, pressed && styles.newGameInfoBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="New mission info">
            <Text style={styles.newGameInfoText}>i</Text>
          </Pressable>
          <Pressable
            onPress={onNewMission}
            style={({ pressed }) => [styles.newGameBtn, pressed && styles.newGameBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="New mission, shuffle the grid">
            <Text style={styles.newGameBtnText}>New Mission</Text>
          </Pressable>
        </View>
        <View style={styles.finishBottomRow}>
          <Pressable
            onPress={onOpenFinishHelp}
            style={({ pressed }) => [styles.finishInfoBtn, pressed && styles.finishInfoBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Finish excavation info">
            <Text style={styles.finishInfoText}>i</Text>
          </Pressable>
          <Pressable
            onPress={onFinishExcavation}
            disabled={finishDisabled}
            style={({ pressed }) => [
              styles.finishBtn,
              pressed && styles.finishBtnPressed,
              finishPulse && styles.finishBtnPulse,
              finishDisabled && styles.finishBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Finish Excavation">
            <Text style={styles.finishBtnText}>Finish Excavation</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
    alignItems: 'center',
  },
  title: {
    color: SV.surgicalWhite,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  titlePlaySpacing: {
    marginBottom: 20,
  },
  memorizeHint: {
    color: SV.neonCyan,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    maxWidth: 340,
  },
  lockedHint: {
    color: '#FFC68A',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,138,0,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,138,0,0.35)',
    maxWidth: 360,
  },
  timeoutHint: {
    color: TIMEOUT_AMBER,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,191,0,0.12)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,191,0,0.35)',
    maxWidth: 360,
  },
  excavationBarWrap: {
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 0,
    marginBottom: 16,
    alignSelf: 'center',
  },
  excavationBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,255,255,0.1)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.28)',
  },
  excavationBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: SV.neonCyan,
    shadowColor: SV.neonCyan,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  failHint: {
    color: '#FFC68A',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,255,255,0.06)',
    borderRadius: 8,
    maxWidth: 360,
  },
  successStandbyHint: {
    color: SV.neonCyan,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,255,255,0.08)',
    borderRadius: 8,
    maxWidth: 360,
  },
  tabReturnHint: {
    color: SV.neonCyan,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,255,255,0.06)',
    borderRadius: 8,
    maxWidth: 360,
  },
  gridWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  newGameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  newGameInfoBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: SV.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,255,255,0.08)',
  },
  newGameInfoBtnPressed: {
    opacity: 0.85,
  },
  newGameInfoText: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '700',
  },
  newGameBtn: {
    alignSelf: 'center',
    minWidth: 210,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    backgroundColor: SV.black,
    borderWidth: 1,
    borderColor: SV.neonCyan,
  },
  newGameBtnPressed: {
    opacity: 0.88,
  },
  newGameBtnText: {
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  finishBottomRow: {
    marginTop: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  finishInfoBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: SV.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,255,255,0.08)',
  },
  finishInfoBtnPressed: {
    opacity: 0.85,
  },
  finishInfoText: {
    color: SV.neonCyan,
    fontSize: 16,
    fontWeight: '700',
  },
  finishBtn: {
    minWidth: 210,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: SV.neonCyan,
    borderWidth: 1,
    borderColor: SV.neonCyan,
    shadowColor: SV.neonCyan,
    shadowOpacity: 0.24,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  finishBtnPressed: {
    opacity: 0.9,
  },
  finishBtnPulse: {
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  finishBtnDisabled: {
    opacity: 0.55,
  },
  finishBtnText: {
    color: SV.black,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: SV.gunmetal,
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.32)',
    zIndex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  successModalEyebrow: {
    color: SV.surgicalWhite,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.85,
  },
  successModalTitle: {
    color: SV.neonCyan,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  successModalBody: {
    color: SV.surgicalWhite,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
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
    zIndex: 1,
  },
  modalTitle: {
    color: SV.neonCyan,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalSectionLabel: {
    color: SV.neonCyan,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalBody: {
    color: SV.surgicalWhite,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },
  modalBodyLeft: {
    color: SV.surgicalWhite,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'left',
  },
  modalScroll: {
    maxHeight: 280,
    marginBottom: 14,
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  modalPrimary: {
    alignSelf: 'center',
    backgroundColor: SV.neonCyan,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalPrimaryPressed: {
    opacity: 0.88,
  },
  modalPrimaryText: {
    color: SV.black,
    fontSize: 15,
    fontWeight: '700',
  },
  modalSecondary: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalSecondaryPressed: {
    opacity: 0.75,
  },
  modalSecondaryText: {
    color: SV.surgicalWhite,
    fontSize: 14,
    fontWeight: '600',
  },
});
