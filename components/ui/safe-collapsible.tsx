import React from "react";
import { View } from "react-native";

// Import do módulo existente (pode ter default ou named export)
import * as CollapsibleModule from "./collapsible";

type Props = {
  title?: React.ReactNode;
  initiallyExpanded?: boolean;
  children?: React.ReactNode;
};

type CollapsibleLike = React.ComponentType<Props>;

function resolveCollapsible(): CollapsibleLike | null {
  const mod = CollapsibleModule as unknown as {
    default?: CollapsibleLike;
    Collapsible?: CollapsibleLike;
  };

  return mod.default ?? mod.Collapsible ?? null;
}

const Resolved = resolveCollapsible();

export function SafeCollapsible(props: Props) {
  if (Resolved) return <Resolved {...props} />;

  // Fallback seguro (sem crash)
  return (
    <View>
      {props?.title ? <View style={{ marginBottom: 8 }}>{props.title}</View> : null}
      <View>{props?.children}</View>
    </View>
  );
}