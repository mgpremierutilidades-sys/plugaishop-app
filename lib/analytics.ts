type TrackProps = Record<string, any>;

export function track(event: string, props?: TrackProps): void {
  // Adapter mínimo. Trocar depois por provider real.
  if (__DEV__) {
    console.log(`[analytics] ${event}`, props ?? {});
  }
}
