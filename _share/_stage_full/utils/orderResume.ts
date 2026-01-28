import { router } from "expo-router";

import { getCheckoutResumeHref } from "./checkoutFlow";
import { loadOrderDraft } from "./orderStorage";

export async function resumeCheckoutIfNeeded() {
  const draft = await loadOrderDraft();
  if (!draft) return;

  const href = getCheckoutResumeHref(draft as any);
  if (href) {
    router.replace(href as any);
  }
}
