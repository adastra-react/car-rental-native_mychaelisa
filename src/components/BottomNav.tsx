import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "../theme/tokens";

const palette = colors.dark;

export type AppMode = "renter" | "host";

type TabConfig = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconSelected: keyof typeof Ionicons.glyphMap;
};

const renterTabs: TabConfig[] = [
  { key: "home", label: "Home", icon: "home-outline", iconSelected: "home" },
  {
    key: "explore",
    label: "Explore",
    icon: "compass-outline",
    iconSelected: "compass",
  },
  {
    key: "trips",
    label: "Trips",
    icon: "document-text-outline",
    iconSelected: "document-text",
  },
  {
    key: "messages",
    label: "Messages",
    icon: "chatbubble-outline",
    iconSelected: "chatbubble",
  },
  {
    key: "profile",
    label: "Profile",
    icon: "person-outline",
    iconSelected: "person",
  },
];

const hostTabs: TabConfig[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "grid-outline",
    iconSelected: "grid",
  },
  {
    key: "listings",
    label: "Listings",
    icon: "car-outline",
    iconSelected: "car",
  },
  {
    key: "calendar",
    label: "Calendar",
    icon: "calendar-outline",
    iconSelected: "calendar",
  },
  {
    key: "messages",
    label: "Messages",
    icon: "chatbubble-outline",
    iconSelected: "chatbubble",
  },
  {
    key: "profile",
    label: "Profile",
    icon: "person-outline",
    iconSelected: "person",
  },
];

type Props = {
  mode: AppMode;
  currentTab: string;
  onSelectTab: (tabKey: string) => void;
};

export function BottomNav({ mode, currentTab, onSelectTab }: Props) {
  const insets = useSafeAreaInsets();
  const tabs = mode === "renter" ? renterTabs : hostTabs;
  const accent = mode === "renter" ? palette.primary : palette.secondary;
  const centerFill = mode === "renter" ? palette.primaryBright : palette.secondary;
  const centerText = mode === "renter" ? palette.onPrimary : "#0A0A0A";
  const bottomOffset = Math.max(insets.bottom - 4, 6);

  return (
    <View style={[styles.frame, { bottom: bottomOffset }]}>
      <View style={styles.glass}>
        <View style={styles.row}>
          {tabs.map((tab, index) => {
            if (index === 2) {
              return <View key={tab.key} style={styles.centerSpacer} />;
            }

            const selected = currentTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => onSelectTab(tab.key)}
                style={styles.sideItem}
              >
                <Ionicons
                  name={selected ? tab.iconSelected : tab.icon}
                  size={20}
                  color={selected ? accent : palette.onSurfaceVariant}
                />
                <Text style={[styles.sideLabel, selected && { color: accent }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        onPress={() => onSelectTab(tabs[2].key)}
        style={[
          styles.centerButton,
          {
            backgroundColor: centerFill,
            shadowColor: accent,
          },
        ]}
      >
        <Ionicons
          name={currentTab === tabs[2].key ? tabs[2].iconSelected : tabs[2].icon}
          size={24}
          color={centerText}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "absolute",
    left: spacing.screen,
    right: spacing.screen,
    zIndex: 20,
    height: 64,
    justifyContent: "flex-end",
    overflow: "visible",
  },
  glass: {
    height: 64,
    borderRadius: radii.navPill,
    backgroundColor: palette.navGlassBackground,
    borderWidth: 1,
    borderColor: palette.navGlassTopEdge,
    shadowColor: palette.shadow,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 10,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
  },
  sideItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  centerSpacer: {
    flex: 1,
  },
  sideLabel: {
    color: palette.onSurfaceVariant,
    ...typography.labelSmall,
  },
  centerButton: {
    position: "absolute",
    alignSelf: "center",
    bottom: 36,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 12,
  },
});
