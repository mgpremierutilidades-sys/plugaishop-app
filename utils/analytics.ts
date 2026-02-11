type AnalyticsProps = Record<string, unknown>;

const FF_ANALYTICS = process.env.EXPO_PUBLIC_FF_ANALYTICS === "1";

function safeJson(obj: unknown) {
  try {
    return JSON.stringify(obj);
  } catch {
    return '"[unserializable]"';
  }
}

export function track(event: string, props: AnalyticsProps = {}) {
  if (!FF_ANALYTICS) return;

   
  console.log(`[analytics] ${event} ${safeJson(props)}`);
}
