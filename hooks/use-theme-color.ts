// hooks/use-theme-color.ts
import { ColorName, Colors } from "../constants/theme";

type ThemeProps = {
  light?: string;
  dark?: string;
};

export function useThemeColor(props: ThemeProps, colorName: ColorName) {
  // Por enquanto ignoramos claro/escuro e usamos a mesma paleta
  if (props.light || props.dark) {
    return props.light ?? props.dark!;
  }
  return Colors[colorName];
}
