// lib/nav.ts
let activeScreen = "unknown";

export function setActiveScreenName(name: string) {
  activeScreen = name || "unknown";
}

export function getActiveScreenName() {
  return activeScreen;
}
