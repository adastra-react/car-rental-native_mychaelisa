import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppMode } from "./BottomNav";
import { colors, radii, spacing, typography } from "../theme/tokens";

const palette = colors.light;

type Props = {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
};

export function ModeSwitch({ mode, onChange }: Props) {
  return (
    <View style={styles.outer}>
      <Pressable
        onPress={() => onChange("renter")}
        style={[styles.option, mode === "renter" && styles.optionActive]}
      >
        <Text style={[styles.label, mode === "renter" && styles.labelActive]}>
          Renter
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("host")}
        style={[styles.option, mode === "host" && styles.hostActive]}
      >
        <Text style={[styles.label, mode === "host" && styles.hostLabelActive]}>
          Host
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flexDirection: "row",
    backgroundColor: palette.surfaceVariant,
    borderRadius: radii.round,
    padding: 4,
    gap: 4,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.round,
  },
  optionActive: {
    backgroundColor: palette.primary,
  },
  hostActive: {
    backgroundColor: palette.secondary,
  },
  label: {
    color: palette.onSurfaceVariant,
    ...typography.labelLarge,
  },
  labelActive: {
    color: palette.onPrimary,
  },
  hostLabelActive: {
    color: palette.onSecondary,
  },
});
