// A short tap of the phone under the finger. Capacitor is not installed yet (Phase 5b): inside the
// native shell its bridge exposes `Capacitor.Plugins.Haptics` when the plugin is there, so this reads
// it at call time without a dependency; in the browser it falls back to the Vibration API (Android
// Chrome — iOS Safari has none, which is fine: haptics are a bonus, never information).

type ImpactStyle = 'LIGHT' | 'MEDIUM' | 'HEAVY';

interface HapticsPlugin {
  impact?: (options: { style: ImpactStyle }) => Promise<void>;
  selectionChanged?: () => Promise<void>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: { Haptics?: HapticsPlugin };
}

function nativeHaptics(): HapticsPlugin | null {
  const capacitor = (window as Window & { Capacitor?: CapacitorGlobal }).Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;
  return capacitor.Plugins?.Haptics ?? null;
}

const VIBRATE_MS: Record<ImpactStyle, number> = { LIGHT: 8, MEDIUM: 20, HEAVY: 30 };

export function hapticImpact(style: ImpactStyle = 'LIGHT'): void {
  try {
    const native = nativeHaptics();
    if (native?.impact) {
      void native.impact({ style }).catch(() => undefined);
      return;
    }
    navigator.vibrate?.(VIBRATE_MS[style]);
  } catch {
    // No haptics on this device.
  }
}

/** A selection tick (the dock changing tab). */
export function hapticSelection(): void {
  try {
    const native = nativeHaptics();
    if (native?.selectionChanged) {
      void native.selectionChanged().catch(() => undefined);
      return;
    }
    navigator.vibrate?.(VIBRATE_MS.LIGHT);
  } catch {
    // No haptics on this device.
  }
}
