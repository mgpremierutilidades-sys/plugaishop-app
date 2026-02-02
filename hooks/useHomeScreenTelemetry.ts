// hooks/useHomeScreenTelemetry.ts
import { track } from "../utils/telemetry";

type HomeEventBase = {
  scope: string;
  id?: string;
  message?: string;
  code?: string;
};

export function useHomeScreenTelemetry() {
  const trackHomeView = async (payload: HomeEventBase) => {
    try {
      track("view_home", payload);
    } catch {
      // ignore
    }
  };

  const trackHomeClick = async (payload: HomeEventBase) => {
    try {
      track("click_home", payload);
    } catch {
      // ignore
    }
  };

  const trackHomeFail = async (payload: HomeEventBase) => {
    try {
      track("fail_home", payload);
    } catch {
      // ignore
    }
  };

  return { trackHomeView, trackHomeClick, trackHomeFail };
}
