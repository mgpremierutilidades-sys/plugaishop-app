// hooks/use-color-scheme.web.ts
export function useColorScheme() {
  // No web, se quiser, sempre "light"
  return "light" as const;
}
