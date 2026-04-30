import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
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
import {
  playMissionSuccessSfx,
  preloadMissionSuccessSfx,
} from '@/src/audio/missionSuccessSfx';
import { playTileFailSfx } from '@/src/audio/tileFailSfx';
import { playTileRevealSfx } from '@/src/audio/tileRevealSfx';
import { GlimpseRevealBoard } from '@/src/components/game/GlimpseRevealBoard';
import { StareRevealBoard } from '@/src/components/game/StareRevealBoard';
import { TranceHexagonGrid, type TranceHexStatus } from '@/src/components/game/TranceHexagonGrid';
import { GLIMPSE_HELP_HINT, GLIMPSE_HELP_SUMMARY } from '@/src/content/glimpsePhaseHelp';
import { useSfxPreference } from '@/src/contexts/SfxPreferenceContext';
import { useSessionSecurity } from '@/src/contexts/SessionSecurityContext';
import { useVaultProgress } from '@/src/contexts/VaultProgressContext';
import { shuffledGlimpseGreyPalette } from '@/src/game/glimpsePalette';
import { shuffledStareGreyPalette } from '@/src/game/starePalette';
import { shuffledTranceAmberPalette } from '@/src/game/trancePalette';
import { generateRandomNeuralBlocks, neuralBlockToTileIndex } from '@/src/game/neuralBlocks';
import {
  generateRandomStareNeuralBlocks,
  STARE_GRID_TILE_COUNT,
  stareNeuralBlockToTileIndex,
} from '@/src/game/stareNeuralBlocks';
import { playMissionSuccessHaptics } from '@/src/haptics/missionSuccessHaptics';
import type { VaultAttemptsLeft } from '@/src/preferences/vaultProgress';
import { parseVigilPhaseParam, PHASE_ACCENTS } from '@/src/theme/phaseAccents';
import { SV } from '@/src/theme/skelevigil';

const MEMORIZE_MS = 5000;
const SCAN_MS = 2000;
const GLIMPSE_PLAY_TIME_SEC = 25;
/** Stare mission clock (seconds) — matches 7×5 (35-tile) board; longer than Glimpse. */
const STARE_PLAY_TIME_SEC = 35;
const TRANCE_PLAY_TIME_SEC = 70;
const TIMEOUT_AMBER = '#FFBF00';

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

function buildRandomTranceStatuses(activeCount: number): TranceHexStatus[] {
  const total = 35;
  const pool = Array.from({ length: total }, (_, idx) => idx);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const activeSet = new Set(pool.slice(0, Math.max(0, Math.min(activeCount, total))));
  return Array.from({ length: total }, (_, idx) => (activeSet.has(idx) ? 'active' : 'future'));
}

export default function VigilScreen() {
  const navigation = useNavigation();
  const { phase: phaseParam } = useLocalSearchParams<{ phase?: string }>();
  const vigilPhase = parseVigilPhaseParam(phaseParam);
  const isGlimpse = vigilPhase === 'glimpse';
  const isStare = vigilPhase === 'stare';
  const isMissionGrid = isGlimpse || isStare;
  const accent = PHASE_ACCENTS[vigilPhase];
  const vaultTier: keyof VaultAttemptsLeft =
    vigilPhase === 'stare' ? 'stare' : vigilPhase === 'trance' ? 'trance' : 'glimpse';

  const { sfxEnabled } = useSfxPreference();
  const { keepAwakeDuringMissions } = useSessionSecurity();
  const {
    progress,
    recordMissionSuccess,
    recordMissionFailure,
    deductVaultAttempt,
  } = useVaultProgress();
  const { width } = useWindowDimensions();
  const gridSize = Math.min(Math.max(width - 40, 220), 360);
  const scale = gridSize / GLIMPSE_PREVIEW_SIZE;
  const matPadding = Math.max(6, Math.round(GLIMPSE_GRID_INSET * scale));
  const cellGap = Math.max(2, Math.round(GLIMPSE_CELL_GAP * scale));

  const [neuralBlocks, setNeuralBlocks] = useState(() => generateRandomNeuralBlocks());
  const [stareNeuralBlocks, setStareNeuralBlocks] = useState(() =>
    generateRandomStareNeuralBlocks(),
  );
  /** Start idle until the first New Mission (no auto-memorize on first land). */
  const [phase, setPhase] = useState<'memorize' | 'play' | 'paused'>('paused');
  const [memorizeSecondsLeft, setMemorizeSecondsLeft] = useState(5);
  const [failedIndex, setFailedIndex] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [playSecondsLeft, setPlaySecondsLeft] = useState(GLIMPSE_PLAY_TIME_SEC);
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
  /** Stare / Trance placeholder: sortie open until Finish Excavation. */
  const [placeholderRoundOpen, setPlaceholderRoundOpen] = useState(false);
  const [trancePhase, setTrancePhase] = useState<'idle' | 'memorize' | 'play'>('idle');
  const [tranceStatuses, setTranceStatuses] = useState<TranceHexStatus[]>(() =>
    Array.from({ length: 35 }, () => 'future'),
  );
  const [tranceSecondsLeft, setTranceSecondsLeft] = useState(TRANCE_PLAY_TIME_SEC);
  const [tranceMemorizeLeft, setTranceMemorizeLeft] = useState(5);
  const tranceActiveSetRef = useRef<Set<number>>(new Set());
  const tranceRevealedSetRef = useRef<Set<number>>(new Set());
  const tranceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tranceMemorizeTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tranceMemorizeDoneRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);

  const missionSuccessOpenRef = useRef(missionSuccessModalVisible);
  const awaitingWinStandbyRef = useRef(awaitingNewMissionAfterSuccess);
  missionSuccessOpenRef.current = missionSuccessModalVisible;
  awaitingWinStandbyRef.current = awaitingNewMissionAfterSuccess;

  const [gridColors, setGridColors] = useState(() => shuffledGlimpseGreyPalette());
  const [stareGridColors, setStareGridColors] = useState(() => shuffledStareGreyPalette());
  const [tranceFieldColors, setTranceFieldColors] = useState(() => shuffledTranceAmberPalette());
  const [revealed, setRevealed] = useState<boolean[]>(() =>
    Array.from({ length: 25 }, () => false),
  );
  const [stareRevealed, setStareRevealed] = useState<boolean[]>(() =>
    Array.from({ length: STARE_GRID_TILE_COUNT }, () => false),
  );
  const revealedRef = useRef(revealed);
  const stareRevealedRef = useRef(stareRevealed);
  revealedRef.current = revealed;
  stareRevealedRef.current = stareRevealed;
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
  /** This grid was paid for via New Mission debit; failure should not also call recordMissionFailure. */
  const paidForCurrentRoundRef = useRef(false);
  timedOutRef.current = timedOut;

  const phaseReserves = progress.attemptsLeft[vaultTier];
  const phaseLocked = phaseReserves <= 0 && !hasActiveRound;
  const placeholderLocked = phaseReserves <= 0 && !placeholderRoundOpen;

  const neuralTileSetForUi = useMemo(
    () => new Set(neuralBlocks.map(neuralBlockToTileIndex)),
    [neuralBlocks],
  );
  const stareNeuralTileSet = useMemo(
    () => new Set(stareNeuralBlocks.map(stareNeuralBlockToTileIndex)),
    [stareNeuralBlocks],
  );
  const hasRevealedSafeTile = useMemo(() => {
    if (isGlimpse) {
      return revealed.some((isRev, idx) => isRev && !neuralTileSetForUi.has(idx));
    }
    if (isStare) {
      return stareRevealed.some((isRev, idx) => isRev && !stareNeuralTileSet.has(idx));
    }
    return false;
  }, [isGlimpse, isStare, revealed, stareRevealed, neuralTileSetForUi, stareNeuralTileSet]);

  const applyGlimpseShuffle = useCallback(() => {
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

  const applyStareShuffle = useCallback(() => {
    outcomeCommittedRef.current = false;
    setPhase('memorize');
    setMemorizeSecondsLeft(5);
    setStareNeuralBlocks(generateRandomStareNeuralBlocks());
    setStareGridColors(shuffledStareGreyPalette());
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
    const fresh = Array.from({ length: STARE_GRID_TILE_COUNT }, () => false);
    stareRevealedRef.current = fresh;
    setStareRevealed(fresh);
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
      if (!keepAwakeDuringMissions) return undefined;
      void activateKeepAwakeAsync();
      return () => {
        deactivateKeepAwake();
      };
    }, [keepAwakeDuringMissions]),
  );

  useFocusEffect(
    useCallback(() => {
      if (vigilPausedAfterNextTabFocus) {
        vigilPausedAfterNextTabFocus = false;
        if (
          (isGlimpse || isStare) &&
          !missionSuccessOpenRef.current &&
          !awaitingWinStandbyRef.current
        ) {
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
    }, [isGlimpse, isStare]),
  );

  useEffect(() => {
    setPlaceholderRoundOpen(false);
    setTrancePhase('idle');
    setTranceStatuses(Array.from({ length: 35 }, () => 'future'));
    setTranceSecondsLeft(TRANCE_PLAY_TIME_SEC);
    setTranceMemorizeLeft(5);
    tranceActiveSetRef.current = new Set();
    tranceRevealedSetRef.current = new Set();
    if (tranceTimerRef.current) {
      clearInterval(tranceTimerRef.current);
      tranceTimerRef.current = null;
    }
    if (tranceMemorizeTickRef.current) {
      clearInterval(tranceMemorizeTickRef.current);
      tranceMemorizeTickRef.current = null;
    }
    if (tranceMemorizeDoneRef.current) {
      clearTimeout(tranceMemorizeDoneRef.current);
      tranceMemorizeDoneRef.current = null;
    }
  }, [vigilPhase]);

  useEffect(() => {
    void preloadMissionSuccessSfx();
  }, []);

  const fireMissionSuccessCelebration = useCallback(() => {
    if (!sfxEnabled) {
      void playMissionSuccessHaptics();
      return;
    }
    void Promise.all([playMissionSuccessSfx(), playMissionSuccessHaptics()]);
  }, [sfxEnabled]);

  const commitMissionSuccess = () => {
    if (outcomeCommittedRef.current) return;
    outcomeCommittedRef.current = true;
    paidForCurrentRoundRef.current = false;
    setHasActiveRound(false);
    recordMissionSuccess(vaultTier);
  };

  const commitMissionFailure = () => {
    if (outcomeCommittedRef.current) return;
    outcomeCommittedRef.current = true;
    setHasActiveRound(false);
    lastRoundConsumedReserveRef.current = true;
    const paidRound = paidForCurrentRoundRef.current;
    paidForCurrentRoundRef.current = false;
    recordMissionFailure(vaultTier, { debitReserve: !paidRound });
  };

  useEffect(() => {
    if (!isMissionGrid) return;
    if (phaseLocked) {
      outcomeCommittedRef.current = false;
      setPhase('play');
      setMemorizeSecondsLeft(0);
      setFailedIndex(null);
      setTimedOut(false);
      setPlaySecondsLeft(
        vigilPhase === 'stare' ? STARE_PLAY_TIME_SEC : GLIMPSE_PLAY_TIME_SEC,
      );
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
      setPlaySecondsLeft(
        vigilPhase === 'stare' ? STARE_PLAY_TIME_SEC : GLIMPSE_PLAY_TIME_SEC,
      );
    }, MEMORIZE_MS);
    memorizeDoneRef.current = done;
    return () => {
      clearInterval(tick);
      clearTimeout(done);
      memorizeTickRef.current = null;
      memorizeDoneRef.current = null;
    };
  }, [
    isMissionGrid,
    vigilPhase,
    neuralBlocks,
    stareNeuralBlocks,
    phaseLocked,
    awaitingNewMissionAfterSuccess,
  ]);

  useEffect(() => {
    if (!isMissionGrid) return;
    if (phaseLocked) return;
    if (phase !== 'play') return;
    if (awaitingNewMissionAfterSuccess) return;
    if (failedIndex != null || timedOut) return;

    const cap = vigilPhase === 'stare' ? STARE_PLAY_TIME_SEC : GLIMPSE_PLAY_TIME_SEC;
    setPlaySecondsLeft(cap);
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
  }, [
    isMissionGrid,
    vigilPhase,
    phase,
    neuralBlocks,
    stareNeuralBlocks,
    failedIndex,
    timedOut,
    phaseLocked,
    awaitingNewMissionAfterSuccess,
  ]);

  useEffect(() => {
    if (!isMissionGrid) return;
    if (!timedOut) return;
    commitMissionFailure();
  }, [isMissionGrid, timedOut]);

  const onNewMission = () => {
    const skipDebit = lastRoundConsumedReserveRef.current;
    if (phaseReserves <= 0 && !skipDebit) {
      setReservesEmptyModalVisible(true);
      return;
    }
    // Before deduct: local vault deduct updates reserves synchronously; without this,
    // one render can see 0 reserves and !hasActiveRound → phaseLocked and the locked-branch effect.
    setHasActiveRound(true);
    lastRoundConsumedReserveRef.current = false;
    if (!skipDebit) {
      deductVaultAttempt(vaultTier);
    }
    paidForCurrentRoundRef.current = !skipDebit;
    if (isGlimpse) applyGlimpseShuffle();
    else if (isStare) applyStareShuffle();
  };

  const onRevealCell = (index: number) => {
    if (phaseLocked) return;
    if (phase !== 'play') return;
    if (awaitingNewMissionAfterSuccess) return;
    if (failedIndex != null || timedOut) return;

    if (isGlimpse) {
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
      return;
    }

    if (isStare) {
      if (stareRevealedRef.current[index]) return;
      if (stareNeuralTileSet.has(index)) {
        setFailedIndex(index);
        setTimedOut(false);
        commitMissionFailure();
        if (sfxEnabled) void playTileFailSfx();
        return;
      }
      if (sfxEnabled) void playTileRevealSfx();
      setStareRevealed((prev) => {
        if (prev[index]) return prev;
        const next = [...prev];
        next[index] = true;
        stareRevealedRef.current = next;
        return next;
      });
    }
  };

  const onOpenFinishHelp = () => {
    setInfoModal({ title: 'Summary', body: GLIMPSE_HELP_SUMMARY });
  };

  const onOpenNewGameHelp = () => {
    setInfoModal({ title: 'Hint', body: GLIMPSE_HELP_HINT });
  };

  const onFinishExcavation = () => {
    if (!isMissionGrid) return;
    if (phaseLocked) return;
    if (phase !== 'play') return;
    if (awaitingNewMissionAfterSuccess) return;
    if (outcomeCommittedRef.current) return;
    if (failedIndex != null || timedOut) return;
    if (scanProgress != null) return;
    if (!hasRevealedSafeTile) return;

    setFinishPulse(true);
    setTimeout(() => setFinishPulse(false), 220);

    const neuralTileSet = isGlimpse
      ? new Set(neuralBlocks.map(neuralBlockToTileIndex))
      : stareNeuralTileSet;
    const gridLen = isGlimpse ? 25 : STARE_GRID_TILE_COUNT;

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

        const current = isGlimpse ? revealedRef.current : stareRevealedRef.current;
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
          fireMissionSuccessCelebration();
          const fullyRevealed = Array.from({ length: gridLen }, () => true);
          if (isGlimpse) {
            revealedRef.current = fullyRevealed;
            setRevealed(fullyRevealed);
          } else {
            stareRevealedRef.current = fullyRevealed;
            setStareRevealed(fullyRevealed);
          }
          setSuccessPulseToken((n) => n + 1);
          setAwaitingNewMissionAfterSuccess(true);
          setMissionSuccessModalVisible(true);
          return;
        }

        const firstNeuralIdx = isGlimpse
          ? neuralBlocks.length > 0
            ? neuralBlockToTileIndex(neuralBlocks[0]!)
            : 0
          : stareNeuralBlocks.length > 0
            ? stareNeuralBlockToTileIndex(stareNeuralBlocks[0]!)
            : 0;
        setFailedIndex(firstNeuralIdx);
        setTimedOut(false);
        commitMissionFailure();
        if (sfxEnabled) void playTileFailSfx();
      }
    }, 16);
    finishScanTimerRef.current = timer;
  };

  const finishDisabled =
    phaseLocked ||
    phase !== 'play' ||
    awaitingNewMissionAfterSuccess ||
    failedIndex != null ||
    timedOut ||
    scanProgress != null ||
    !hasRevealedSafeTile;

  const onPlaceholderNewMission = useCallback(() => {
    if (placeholderLocked) {
      setReservesEmptyModalVisible(true);
      return;
    }
    deductVaultAttempt(vaultTier);
    setPlaceholderRoundOpen(true);
    setTrancePhase('memorize');
    setTranceMemorizeLeft(5);
    setTranceSecondsLeft(TRANCE_PLAY_TIME_SEC);
    setTranceFieldColors(shuffledTranceAmberPalette());
    const fresh = buildRandomTranceStatuses(10);
    setTranceStatuses(fresh);
    tranceActiveSetRef.current = new Set(
      fresh.map((status, idx) => (status === 'active' ? idx : -1)).filter((idx) => idx >= 0),
    );
    tranceRevealedSetRef.current = new Set();
    if (tranceTimerRef.current) {
      clearInterval(tranceTimerRef.current);
      tranceTimerRef.current = null;
    }
    if (tranceMemorizeTickRef.current) clearInterval(tranceMemorizeTickRef.current);
    if (tranceMemorizeDoneRef.current) clearTimeout(tranceMemorizeDoneRef.current);
    tranceMemorizeTickRef.current = setInterval(() => {
      setTranceMemorizeLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    tranceMemorizeDoneRef.current = setTimeout(() => {
      if (tranceMemorizeTickRef.current) {
        clearInterval(tranceMemorizeTickRef.current);
        tranceMemorizeTickRef.current = null;
      }
      setTrancePhase('play');
      setTranceStatuses(Array.from({ length: 35 }, () => 'future'));
      tranceTimerRef.current = setInterval(() => {
        setTranceSecondsLeft((s) => {
          if (s <= 1) {
            if (tranceTimerRef.current) {
              clearInterval(tranceTimerRef.current);
              tranceTimerRef.current = null;
            }
            setPlaceholderRoundOpen(false);
            setTrancePhase('idle');
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }, 5000);
  }, [deductVaultAttempt, placeholderLocked, vaultTier]);

  const onPlaceholderFinishExcavation = useCallback(() => {
    if (!placeholderRoundOpen) return;
    setPlaceholderRoundOpen(false);
    setTrancePhase('idle');
    if (tranceTimerRef.current) {
      clearInterval(tranceTimerRef.current);
      tranceTimerRef.current = null;
    }
    if (tranceMemorizeTickRef.current) {
      clearInterval(tranceMemorizeTickRef.current);
      tranceMemorizeTickRef.current = null;
    }
    if (tranceMemorizeDoneRef.current) {
      clearTimeout(tranceMemorizeDoneRef.current);
      tranceMemorizeDoneRef.current = null;
    }
  }, [placeholderRoundOpen]);

  const onTrancePressCell = useCallback(
    (index: number) => {
      if (trancePhase !== 'play' || !placeholderRoundOpen) return;
      const isTarget = tranceActiveSetRef.current.has(index);
      setTranceStatuses((prev) => {
        const next = [...prev];
        if (isTarget) {
          next[index] = 'active';
          tranceRevealedSetRef.current.add(index);
        } else {
          next[index] = 'shattered';
        }
        return next;
      });
      if (!isTarget) {
        setPlaceholderRoundOpen(false);
        setTrancePhase('idle');
        if (tranceTimerRef.current) {
          clearInterval(tranceTimerRef.current);
          tranceTimerRef.current = null;
        }
        return;
      }
      const activeSize = tranceActiveSetRef.current.size;
      const revealedSize = tranceRevealedSetRef.current.size;
      if (activeSize > 0 && revealedSize >= activeSize) {
        setPlaceholderRoundOpen(false);
        setTrancePhase('idle');
        if (tranceTimerRef.current) {
          clearInterval(tranceTimerRef.current);
          tranceTimerRef.current = null;
        }
      }
    },
    [placeholderRoundOpen, trancePhase],
  );

  const placeholderFinishDisabled = !placeholderRoundOpen;

  const reserveEmptyPhaseLabel =
    vaultTier === 'trance' ? 'Trance' : vaultTier === 'stare' ? 'Stare' : 'Glimpse';

  const missionPlayTimeSec =
    vigilPhase === 'stare' ? STARE_PLAY_TIME_SEC : GLIMPSE_PLAY_TIME_SEC;

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
        contentContainerStyle={[
          styles.scrollContent,
          isMissionGrid && isStare && styles.scrollContentStare,
        ]}
        removeClippedSubviews={false}
        showsVerticalScrollIndicator={false}>
        {isMissionGrid ? (
          <>
        <Text
          style={[
            styles.title,
            phase === 'play' &&
              (isStare ? styles.titleStarePlaySpacing : styles.titlePlaySpacing),
            isStare && phase !== 'play' && styles.titleStareCompact,
            { color: accent.primary },
          ]}>
          {accent.title}
        </Text>
        {phaseLocked ? (
          <Text
            style={[styles.lockedHint, isStare && styles.stareCompactHintFooter]}
            accessibilityLiveRegion="polite">
            {reserveEmptyPhaseLabel} attempts are depleted. Buy 3 Vault Credits to continue this mission.
          </Text>
        ) : phase === 'memorize' ? (
          <Text
            style={[styles.memorizeHint, isStare && styles.stareCompactHintFooter]}
            accessibilityLiveRegion="polite">
            {isStare
              ? `Memorize the neural strand. Covers return in ${memorizeSecondsLeft}s — then you have ${STARE_PLAY_TIME_SEC}s to excavate.`
              : `Memorize the neural blocks. Tiles return in ${memorizeSecondsLeft}s.`}
          </Text>
        ) : phase === 'paused' ? (
          <Text
            style={[
              styles.tabReturnHint,
              isStare && styles.stareCompactHintFooter,
              isStare && styles.stareTabReturnTight,
            ]}
            accessibilityLiveRegion="polite">
            {hasBegunSortieRef.current
              ? "Session paused. Tap 'New Mission' when you are ready to continue."
              : "Mission grid is idle. Tap 'New Mission' to deploy your first sortie."}
          </Text>
        ) : awaitingNewMissionAfterSuccess ? (
          <Text
            style={[styles.successStandbyHint, isStare && styles.stareCompactHintFooter]}
            accessibilityLiveRegion="polite">
            Excavation secured. Tap &apos;New Mission&apos; when you are ready for the next sortie.
          </Text>
        ) : timedOut ? (
          <Text
            style={[styles.timeoutHint, isStare && styles.stareCompactHintFooter]}
            accessibilityLiveRegion="polite">
            The excavation has collapsed. Tap &apos;New Mission&apos; to attempt a re-sync.
          </Text>
        ) : failedIndex != null ? (
          <Text
            style={[styles.failHint, isStare && styles.stareCompactHintFooter]}
            accessibilityLiveRegion="polite">
            The Strand has shattered. Tap &apos;New Mission&apos; to start again.
          </Text>
        ) : phase === 'play' ? (
          <View
            style={[styles.excavationBarWrap, isStare && styles.stareCompactExcavationBar]}
            accessibilityLabel={`Excavation time, ${playSecondsLeft} seconds remaining`}
            accessibilityLiveRegion="polite">
            <View style={styles.excavationBarTrack}>
              <View
                style={[
                  styles.excavationBarFill,
                  {
                    width: `${(playSecondsLeft / missionPlayTimeSec) * 100}%`,
                    backgroundColor: accent.primary,
                    shadowColor: accent.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.excavationTimeCaption, { color: accent.primary }]}>
              {playSecondsLeft}s / {missionPlayTimeSec}s
            </Text>
          </View>
        ) : null}
        <View style={[styles.gridWrap, isStare && styles.gridWrapStare]}>
          {isGlimpse ? (
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
                    : (missionPlayTimeSec - playSecondsLeft) / missionPlayTimeSec
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
          ) : (
            <StareRevealBoard
              borderColor={accent.primary}
              neuralTileIndices={stareNeuralTileSet}
              colors={stareGridColors}
              showTiles={phase === 'play'}
              failedIndex={failedIndex}
              timedOut={timedOut}
              excavationPressureFraction={
                phase === 'play' &&
                failedIndex == null &&
                !awaitingNewMissionAfterSuccess
                  ? timedOut
                    ? 1
                    : (missionPlayTimeSec - playSecondsLeft) / missionPlayTimeSec
                  : null
              }
              scanProgress={scanProgress}
              successPulseToken={successPulseToken}
              revealed={stareRevealed}
              onRevealCell={onRevealCell}
            />
          )}
        </View>
        <View style={styles.newGameRow}>
          <Pressable
            onPress={onOpenNewGameHelp}
            style={({ pressed }) => [
              styles.newGameInfoBtn,
              { borderColor: accent.primary, backgroundColor: `${accent.primary}18` },
              pressed && styles.newGameInfoBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="New mission info">
            <Text style={[styles.newGameInfoText, { color: accent.primary }]}>i</Text>
          </Pressable>
          <Pressable
            onPress={onNewMission}
            style={({ pressed }) => [
              styles.newGameBtn,
              { borderColor: accent.primary },
              pressed && styles.newGameBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="New mission, shuffle the grid">
            <Text style={styles.newGameBtnText}>New Mission</Text>
          </Pressable>
        </View>
        <View style={styles.finishBottomRow}>
          <Pressable
            onPress={onOpenFinishHelp}
            style={({ pressed }) => [
              styles.finishInfoBtn,
              { borderColor: accent.primary, backgroundColor: `${accent.primary}18` },
              pressed && styles.finishInfoBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Finish excavation info">
            <Text style={[styles.finishInfoText, { color: accent.primary }]}>i</Text>
          </Pressable>
          <Pressable
            onPress={onFinishExcavation}
            disabled={finishDisabled}
            style={({ pressed }) => [
              styles.finishBtn,
              {
                backgroundColor: accent.primary,
                borderColor: accent.primary,
                shadowColor: accent.primary,
              },
              pressed && styles.finishBtnPressed,
              finishPulse && styles.finishBtnPulse,
              finishDisabled && styles.finishBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Finish Excavation">
            <Text style={styles.finishBtnText}>Finish Excavation</Text>
          </Pressable>
        </View>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: accent.primary }]}>{accent.title}</Text>
            {placeholderLocked ? (
              <Text style={styles.lockedHint} accessibilityLiveRegion="polite">
                {reserveEmptyPhaseLabel} attempts are depleted. Visit the Vault to restore your
                connection.
              </Text>
            ) : (
              <Text style={styles.tabReturnHint} accessibilityLiveRegion="polite">
                {trancePhase === 'memorize'
                  ? `Memorize the Nexus pattern. Hex layer collapses in ${tranceMemorizeLeft}s.`
                  : trancePhase === 'play'
                    ? `Excavate the remembered Nexus cells. ${tranceSecondsLeft}s remaining.`
                    : 'Tap New Mission to begin a sortie on the Trance hex layer.'}
              </Text>
            )}
            <View style={styles.gridWrap}>
              <TranceHexagonGrid
                statuses={tranceStatuses}
                onPressCell={trancePhase === 'play' ? onTrancePressCell : undefined}
                disabled={trancePhase !== 'play'}
                surface={trancePhase === 'play' ? 'field' : 'memory'}
                fieldFills={tranceFieldColors}
                label="Trance vigilance hex layer, seven by five"
              />
            </View>
            <View style={styles.newGameRow}>
              <Pressable
                onPress={onOpenNewGameHelp}
                style={({ pressed }) => [
                  styles.newGameInfoBtn,
                  { borderColor: accent.primary, backgroundColor: `${accent.primary}18` },
                  pressed && styles.newGameInfoBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="New mission info">
                <Text style={[styles.newGameInfoText, { color: accent.primary }]}>i</Text>
              </Pressable>
              <Pressable
                onPress={onPlaceholderNewMission}
                style={({ pressed }) => [
                  styles.newGameBtn,
                  { borderColor: accent.primary },
                  pressed && styles.newGameBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="New mission">
                <Text style={styles.newGameBtnText}>New Mission</Text>
              </Pressable>
            </View>
            <View style={styles.finishBottomRow}>
              <Pressable
                onPress={onOpenFinishHelp}
                style={({ pressed }) => [
                  styles.finishInfoBtn,
                  { borderColor: accent.primary, backgroundColor: `${accent.primary}18` },
                  pressed && styles.finishInfoBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Finish excavation info">
                <Text style={[styles.finishInfoText, { color: accent.primary }]}>i</Text>
              </Pressable>
              <Pressable
                onPress={onPlaceholderFinishExcavation}
                disabled={placeholderFinishDisabled}
                style={({ pressed }) => [
                  styles.finishBtn,
                  {
                    backgroundColor: accent.primary,
                    borderColor: accent.primary,
                    shadowColor: accent.primary,
                  },
                  pressed && styles.finishBtnPressed,
                  placeholderFinishDisabled && styles.finishBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Finish Excavation">
                <Text style={styles.finishBtnText}>Finish Excavation</Text>
              </Pressable>
            </View>
            {vigilPhase === 'trance' ? (
              <Text style={styles.trancePlaceholderNote}>
                Memory layer and play layer now share the same 7x5 hex grid.
              </Text>
            ) : null}
          </>
        )}
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
  /** Less outer padding so hint → playbox and playbox → actions fit on one screen for Stare. */
  scrollContentStare: {
    paddingTop: 2,
    paddingBottom: 10,
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
  /** Stare play: slightly tighter than Glimpse under the phase title during excavation. */
  titleStarePlaySpacing: {
    marginBottom: 14,
  },
  /** Stare: tall playbox needs tighter chrome so New Mission stays on screen. */
  titleStareCompact: {
    marginBottom: 6,
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
  stareCompactExcavationBar: {
    marginBottom: 8,
  },
  excavationTimeCaption: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
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
  stareTabReturnTight: {
    paddingVertical: 3,
  },
  /** Tighter gap above / below the Stare playbox (hint → grid, grid → New Mission). */
  stareCompactHintFooter: {
    marginBottom: 4,
  },
  gridWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridWrapStare: {
    marginBottom: 2,
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
  trancePlaceholderNote: {
    color: SV.muted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 14,
    paddingHorizontal: 12,
    maxWidth: 360,
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
