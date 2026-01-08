// components/global-chrome.tsx
import type { ReactNode } from "react";

type Props = { children: ReactNode };

export default function GlobalChrome({ children }: Props) {
  return <>{children}</>;
}
