import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "../theme/tokens";

const palette = colors.dark;
export const BOTTOM_NAV_CONTENT_INSET = 70;

const HAS_LIQUID_GLASS = isLiquidGlassAvailable();

function NavGlassSurface({ children }: { children: ReactNode }) {
  if (HAS_LIQUID_GLASS) {
    return (
      <GlassView style={styles.glass} glassEffectStyle='regular' isInteractive>
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      intensity={78}
      tint='systemChromeMaterialDark'
      blurMethod='dimezisBlurViewSdk31Plus'
      style={styles.glass}>
      <View style={styles.glassTint} />
      {children}
    </BlurView>
  );
}

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
    icon: "map-outline",
    iconSelected: "map",
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
  const bottomOffset = Math.max(insets.bottom - 20, 20);

  return (
    <View style={[styles.frame, { bottom: bottomOffset }]}>
      <View style={styles.glassShadow}>
        <NavGlassSurface>
          <View style={styles.row}>
            {tabs.map((tab) => {
              const selected = currentTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => onSelectTab(tab.key)}
                  style={styles.sideItem}>
                  <Ionicons
                    name={selected ? tab.iconSelected : tab.icon}
                    size={20}
                    color={selected ? accent : palette.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.sideLabel,
                      selected && styles.selectedSideLabel,
                    ]}
                    numberOfLines={1}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </NavGlassSurface>
      </View>
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
  glassShadow: {
    height: 64,
    borderRadius: radii.navPill,
    shadowColor: palette.shadow,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 10,
  },
  glass: {
    height: 64,
    borderRadius: radii.navPill,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  glassTint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10,10,12,0.32)",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  sideItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  sideLabel: {
    color: palette.onSurfaceVariant,
    ...typography.labelSmall,
  },
  selectedSideLabel: {
    color: palette.onSurface,
  },
});
