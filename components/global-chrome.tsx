import React from "react";

export type GlobalChromeProps = {
  children?: React.ReactNode;
};

export function GlobalChrome({ children }: GlobalChromeProps) {
  return <>{children ?? null}</>;
}

export default GlobalChrome;
