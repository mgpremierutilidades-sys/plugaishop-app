import { loadOrderDraft } from "./orderStorage";
import { router } from "expo-router";

export async function resumeCheckoutIfNeeded() {
  const draft = await loadOrderDraft();
  if (!draft) return;

  // Se existe draft, retoma no review (padrÃ£o marketplace)
  router.replace("/(tabs)/checkout/review");
}
