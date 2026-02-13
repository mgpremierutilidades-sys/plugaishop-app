import { useEffect } from "react";
import { resumeCheckoutIfNeeded } from "../utils/orderResume";

export function useOrderFailSafe() {
  useEffect(() => {
    resumeCheckoutIfNeeded();
  }, []);
}
