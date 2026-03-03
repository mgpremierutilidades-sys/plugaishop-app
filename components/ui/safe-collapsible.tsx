import React from "react";
import { Collapsible } from "./collapsible";

type SafeCollapsibleProps = { title: string; initiallyExpanded?: boolean; children?: React.ReactNode };

export function SafeCollapsible({ title, initiallyExpanded: _i, children }: SafeCollapsibleProps) {
  return <Collapsible title={title}>{children}</Collapsible>;
}