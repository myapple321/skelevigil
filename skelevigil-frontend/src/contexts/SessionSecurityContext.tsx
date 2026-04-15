import { onAuthStateChanged, signOut } from 'firebase/auth';
import { router } from 'expo-router';
import * as Brightness from 'expo-brightness';
import { deactivateKeepAwake } from 'expo-keep-awake';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { getFirebaseAuth } from '@/src/firebase/firebaseApp';
import { writeSessionHeartbeat } from '@/src/firebase/vaultProgressFirestore';
import {
  DEFAULT_KEEP_AWAKE_DURING_MISSIONS,
  DEFAULT_LOCK_SCREEN_MINUTES,
  type LockScreenMinutes,
  getKeepAwakeDuringMissions,
  getLockScreenMinutes,
  setKeepAwakeDuringMissions as persistKeepAwakeDuringMissions,
  setLockScreenMinutes as persistLockScreenMinutes,
} from '@/src/preferences/lockScreenPreference';
import { SV } from '@/src/theme/skelevigil';

const BRIGHTNESS_DIM_AFTER_MS = 5 * 60 * 1000;
const WARNING_WINDOW_MS = 2 * 60 * 1000;
const TICK_MS = 1000;

type SessionSecurityContextValue = {
  lockScreenMinutes: LockScreenMinutes;
  setLockScreenMinutes: (minutes: LockScreenMinutes) => Promise<void>;
  keepAwakeDuringMissions: boolean;
  setKeepAwakeDuringMissions: (enabled: boolean) => Promise<void>;
  hydrated: boolean;
  registerUserActivity: () => void;
  handleSecureLogout: () => Promise<void>;
};

const SessionSecurityContext = createContext<SessionSecurityContextValue | null>(null);

function lockMsFromMinutes(minutes: LockScreenMinutes): number {
  return minutes * 60 * 1000;
}

export function SessionSecurityProvider({ children }: { children: ReactNode }) {
  const [lockScreenMinutes, setLockScreenMinutesState] = useState<LockScreenMinutes>(
    DEFAULT_LOCK_SCREEN_MINUTES,
  );
  const [keepAwakeDuringMissions, setKeepAwakeDuringMissionsState] = useState(
    DEFAULT_KEEP_AWAKE_DURING_MISSIONS,
  );
  const [hydrated, setHydrated] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const [signedInUid, setSignedInUid] = useState<string | null>(null);

  const appStateRef = useRef(AppState.currentState);
  const logoutInFlightRef = useRef(false);
  const dimmedRef = useRef(false);
  /** Captured with getBrightnessAsync() immediately before dimming; restored on resume (not forced to 100%). */
  const brightnessBeforeDimRef = useRef<number | null>(null);
  const warningRaisedRef = useRef(false);
  const lastActivityMsRef = useRef(Date.now());
  const lockMinutesRef = useRef<LockScreenMinutes>(DEFAULT_LOCK_SCREEN_MINUTES);
  lockMinutesRef.current = lockScreenMinutes;

  const setLockScreenMinutes = useCallback(async (minutes: LockScreenMinutes) => {
    setLockScreenMinutesState(minutes);
    await persistLockScreenMinutes(minutes);
  }, []);

  const setKeepAwakeDuringMissions = useCallback(async (enabled: boolean) => {
    setKeepAwakeDuringMissionsState(enabled);
    await persistKeepAwakeDuringMissions(enabled);
  }, []);

  const restoreScreenBrightness = useCallback(async () => {
    try {
      const prev = brightnessBeforeDimRef.current;
      brightnessBeforeDimRef.current = null;
      if (prev != null && Number.isFinite(prev)) {
        const clamped = Math.min(1, Math.max(0, prev));
        await Brightness.setBrightnessAsync(clamped);
      }
    } catch {
      // Ignore if brightness cannot be restored programmatically.
    }
  }, []);

  const dimScreenToBatterySaver = useCallback(async () => {
    try {
      const current = await Brightness.getBrightnessAsync();
      brightnessBeforeDimRef.current = current;
      await Brightness.setBrightnessAsync(0.2);
    } catch {
      brightnessBeforeDimRef.current = null;
      // Non-fatal: some targets do not allow brightness control.
    }
  }, []);

  const restoreAfterActivity = useCallback(() => {
    if (!warningRaisedRef.current && !dimmedRef.current) return;
    warningRaisedRef.current = false;
    setWarningVisible(false);
    if (dimmedRef.current) {
      dimmedRef.current = false;
      void restoreScreenBrightness();
    }
  }, [restoreScreenBrightness]);

  const registerUserActivity = useCallback(() => {
    if (!signedInUid) return;
    lastActivityMsRef.current = Date.now();
    restoreAfterActivity();
  }, [restoreAfterActivity, signedInUid]);

  const handleSecureLogout = useCallback(async () => {
    if (logoutInFlightRef.current) return;
    logoutInFlightRef.current = true;
    try {
      setWarningVisible(false);
      warningRaisedRef.current = false;
      if (dimmedRef.current) {
        dimmedRef.current = false;
        await restoreScreenBrightness();
      }
      deactivateKeepAwake();
      await signOut(getFirebaseAuth());
      router.replace('/(auth)/session-expired');
    } finally {
      logoutInFlightRef.current = false;
    }
  }, [restoreScreenBrightness]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getLockScreenMinutes(), getKeepAwakeDuringMissions()]).then(
      ([minutes, keepAwake]) => {
        if (cancelled) return;
        setLockScreenMinutesState(minutes);
        setKeepAwakeDuringMissionsState(keepAwake);
        setHydrated(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
      setSignedInUid(user?.uid ?? null);
      lastActivityMsRef.current = Date.now();
      setWarningVisible(false);
      warningRaisedRef.current = false;
      if (dimmedRef.current) {
        dimmedRef.current = false;
        void restoreScreenBrightness();
      }
    });
    return unsub;
  }, [restoreScreenBrightness]);

  useEffect(() => {
    if (!hydrated) return;
    const lockMs = lockMsFromMinutes(lockMinutesRef.current);
    const warningMs = Math.max(0, lockMs - WARNING_WINDOW_MS);

    const evaluateInactivity = () => {
      if (!signedInUid) return;
      const elapsed = Date.now() - lastActivityMsRef.current;
      if (elapsed >= lockMs) {
        void handleSecureLogout();
        return;
      }

      if (elapsed >= warningMs && !warningRaisedRef.current) {
        warningRaisedRef.current = true;
        setWarningVisible(true);
      }

      if (elapsed >= BRIGHTNESS_DIM_AFTER_MS && !dimmedRef.current) {
        dimmedRef.current = true;
        void dimScreenToBatterySaver();
      }
    };

    const interval = setInterval(evaluateInactivity, TICK_MS);
    const appStateSub = AppState.addEventListener('change', (next) => {
      const wasBackgrounded = appStateRef.current !== 'active' && next === 'active';
      appStateRef.current = next;
      if (wasBackgrounded) evaluateInactivity();
    });
    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [dimScreenToBatterySaver, handleSecureLogout, hydrated, signedInUid]);

  const onContinueMission = useCallback(() => {
    registerUserActivity();
    if (!signedInUid) return;
    void writeSessionHeartbeat(signedInUid);
  }, [registerUserActivity, signedInUid]);

  const value = useMemo<SessionSecurityContextValue>(
    () => ({
      lockScreenMinutes,
      setLockScreenMinutes,
      keepAwakeDuringMissions,
      setKeepAwakeDuringMissions,
      hydrated,
      registerUserActivity,
      handleSecureLogout,
    }),
    [
      lockScreenMinutes,
      setLockScreenMinutes,
      keepAwakeDuringMissions,
      setKeepAwakeDuringMissions,
      hydrated,
      registerUserActivity,
      handleSecureLogout,
    ],
  );

  return (
    <SessionSecurityContext.Provider value={value}>
      <View
        style={styles.host}
        onStartShouldSetResponderCapture={() => {
          registerUserActivity();
          return false;
        }}
        onMoveShouldSetResponderCapture={() => {
          registerUserActivity();
          return false;
        }}>
        {children}
      </View>
      <Modal visible={warningVisible} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.warningBackdrop}>
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>Session Expiring Soon</Text>
            <Text style={styles.warningBody}>
              No activity was detected. Continue mission to keep your secure session active.
            </Text>
            <Pressable
              onPress={onContinueMission}
              style={({ pressed }) => [styles.warningContinueBtn, pressed && styles.warningContinueBtnPressed]}>
              <Text style={styles.warningContinueText}>CONTINUE MISSION</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSecureLogout()}
              style={({ pressed }) => [styles.warningLogoutBtn, pressed && styles.warningLogoutBtnPressed]}>
              <Text style={styles.warningLogoutText}>LOGOUT NOW</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SessionSecurityContext.Provider>
  );
}

export function useSessionSecurity(): SessionSecurityContextValue {
  const ctx = useContext(SessionSecurityContext);
  if (!ctx) {
    throw new Error('useSessionSecurity must be used within SessionSecurityProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  warningBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.76)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  warningCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 2,
    borderRadius: 14,
    borderColor: SV.neonCyan,
    backgroundColor: '#0a0f12',
    padding: 20,
    gap: 12,
  },
  warningTitle: {
    color: SV.neonCyan,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  warningBody: {
    color: SV.surgicalWhite,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 6,
  },
  warningContinueBtn: {
    minHeight: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SV.neonCyan,
    backgroundColor: SV.neonCyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningContinueBtnPressed: {
    opacity: 0.9,
  },
  warningContinueText: {
    color: SV.black,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  warningLogoutBtn: {
    minHeight: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  warningLogoutBtnPressed: {
    opacity: 0.85,
  },
  warningLogoutText: {
    color: SV.surgicalWhite,
    fontSize: 16,
    fontWeight: '700',
  },
});
