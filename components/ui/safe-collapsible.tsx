import React from "react";

import { Collapsible } from "./collapsible";

type SafeCollapsibleProps = {
  title: string; // ✅ compatível com Collapsible (string)
  initiallyExpanded?: boolean; // compat no wrapper (não usado aqui, mas não quebra call-sites)
  children?: React.ReactNode;
};

/**
 * Wrapper tipado para remover any e garantir contrato “title: string”.
 * Observação: o Collapsible atual controla estado interno (isOpen) e
 * não expõe initiallyExpanded — mantemos o prop no wrapper para compat
 * e futura evolução, mas por enquanto ele é ignorado.
 */
export function SafeCollapsible({
  title,
  initiallyExpanded: _initiallyExpanded,
  children,
}: SafeCollapsibleProps) {
  return <Collapsible title={title}>{children}</Collapsible>;
}