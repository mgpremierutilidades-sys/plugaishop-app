import React from "react";

import { Collapsible } from "./collapsible";

type SafeCollapsibleProps = {
  title: string; // ✅ contrato real do Collapsible
  initiallyExpanded?: boolean; // compat (ignorado: Collapsible controla isOpen internamente)
  children?: React.ReactNode;
};

/**
 * Wrapper tipado para:
 * - remover any
 * - garantir title text-safe (string)
 * - manter call-sites compatíveis (initiallyExpanded existe, mas é ignorado)
 */
export function SafeCollapsible({
  title,
  initiallyExpanded: _initiallyExpanded,
  children,
}: SafeCollapsibleProps) {
  return <Collapsible title={title}>{children}</Collapsible>;
}