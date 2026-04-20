type HapticMethod = 'impactHeavy' | 'notificationSuccess';

type HapticModule = {
  trigger: (
    method: HapticMethod,
    options: {
      enableVibrateFallback: boolean;
      ignoreAndroidSystemSettings: boolean;
    },
  ) => void;
};

const HAPTIC_OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
} as const;

let cachedModule: HapticModule | null = null;
let missingModuleWarned = false;

function getHapticModule(): HapticModule | null {
  if (cachedModule) return cachedModule;
  try {
    // Lazy require prevents startup crash when the native module isn't in the current binary.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-haptic-feedback') as { default?: HapticModule } | HapticModule;
    cachedModule = ('default' in mod ? mod.default : mod) ?? null;
    return cachedModule;
  } catch {
    if (!missingModuleWarned) {
      missingModuleWarned = true;
      // No-op until the app is rebuilt with the native module linked.
      console.warn('Haptics module unavailable: rebuild native app to enable mission success haptics.');
    }
    return null;
  }
}

function triggerHaptic(method: HapticMethod): Promise<void> {
  return new Promise((resolve) => {
    const haptic = getHapticModule();
    if (haptic) {
      haptic.trigger(method, HAPTIC_OPTIONS);
    }
    resolve();
  });
}

/**
 * SkeleVigil success pattern:
 * 1) Heavy anchor hit
 * 2) Success ripple pattern
 */
export async function playMissionSuccessHaptics(): Promise<void> {
  try {
    await triggerHaptic('impactHeavy');
    await triggerHaptic('notificationSuccess');
  } catch {
    // Haptics are best effort.
  }
}
