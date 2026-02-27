import React from "react";
import { Text, View } from "react-native";

import * as CollapsibleModule from "./collapsible";

type Props = {
  title?: string; // ✅ text-safe
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

  // Fallback seguro
  return (
    <View>
      {props?.title ? (
        <View style={{ marginBottom: 8 }}>
          <Text>{props.title}</Text>
        </View>
      ) : null}
      <View>{props?.children}</View>
    </View>
  );
}