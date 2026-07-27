import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";

import { VehicleListing } from "../../types/vehicle";
import { colors } from "../../theme/tokens";
import {
  getListingRating,
  getListingRatingCount,
  getListingTitle,
  getListingYear,
} from "./discoveryHelpers";
import { discoveryStyles as styles } from "./discoveryStyles";

const palette = colors.dark;

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: {
    icon: keyof typeof Ionicons.glyphMap;
    badge?: number;
    onPress: () => void;
  };
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderText}>
        <Text style={styles.pageTitle}>{title}</Text>
        <Text style={styles.pageSubtitle}>{subtitle}</Text>
      </View>
      {action ? (
        <Pressable style={styles.pageHeaderButton} onPress={action.onPress}>
          <Ionicons name={action.icon} size={20} color={palette.onSurface} />
          {action.badge && action.badge > 0 ? (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{action.badge}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

export function PrimaryAction({
  label,
  onPress,
  compact,
}: {
  label: string;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      style={[styles.primaryButton, compact && styles.primaryButtonCompact]}
      onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryAction({
  label,
  onPress,
  compact,
}: {
  label: string;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      style={[styles.secondaryButton, compact && styles.secondaryButtonCompact]}
      onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function PageActionButton({
  icon,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.discoveryActionButton} onPress={onPress}>
      <Ionicons name={icon} size={18} color={palette.onSurface} />
      {badge && badge > 0 ? (
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function DiscoveryCategoryChip({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.discoveryCategoryChip,
        selected && styles.discoveryCategoryChipSelected,
      ]}
      onPress={onPress}>
      <Ionicons
        name={icon}
        size={16}
        color={selected ? "#111111" : palette.onSurfaceVariant}
      />
      <Text
        style={[
          styles.discoveryCategoryLabel,
          selected && styles.discoveryCategoryLabelSelected,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function DiscoveryVehicleCard({
  vehicle,
  accent,
  onPress,
}: {
  vehicle: VehicleListing;
  accent: string;
  onPress: () => void;
}) {
  const year = getListingYear(vehicle);
  const rating = getListingRating(vehicle);
  const ratingCount = getListingRatingCount(vehicle);

  return (
    <Pressable style={styles.discoveryVehicleCard} onPress={onPress}>
      <View style={styles.discoveryVehicleMedia}>
        {vehicle.photos[0]?.url ? (
          <Image
            source={{ uri: vehicle.photos[0].url }}
            style={styles.discoveryVehicleImage}
            resizeMode='cover'
          />
        ) : (
          <View
            style={[
              styles.discoveryVehicleFallback,
              { backgroundColor: accent },
            ]}>
            <Ionicons name='car-sport' size={36} color='#0B0B0B' />
          </View>
        )}
        <View style={styles.discoveryFavoriteButton}>
          <Ionicons name='heart-outline' size={17} color='#FFFFFF' />
        </View>
      </View>

      <View style={styles.discoveryVehicleBody}>
        <Text style={styles.discoveryVehicleTitle} numberOfLines={2}>
          {getListingTitle(vehicle)}
        </Text>
        <View style={styles.discoveryVehicleMetaRow}>
          {year ? <Text style={styles.discoveryVehicleMeta}>{year}</Text> : null}
          <Text style={styles.discoveryVehicleMeta}>•</Text>
          <Text style={styles.discoveryVehicleMeta}>{rating.toFixed(1)}</Text>
          <Ionicons name='star' size={14} color={palette.secondary} />
          <Text style={styles.discoveryVehicleMeta}>({ratingCount})</Text>
        </View>
        <View style={styles.discoveryVehiclePriceStack}>
          <Text style={styles.discoveryVehiclePrice}>
            JMD {vehicle.dailyRate.toLocaleString()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function ToggleButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.toggleButton, selected && styles.toggleButtonSelected]}
      onPress={onPress}>
      <Text
        style={[
          styles.toggleButtonText,
          selected && styles.toggleButtonTextSelected,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, selected && styles.filterChipSelected]}
      onPress={onPress}>
      <Text
        style={[
          styles.filterChipText,
          selected && styles.filterChipTextSelected,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "info" | "neutral" | "error";
}) {
  const toneMap = {
    success: {
      background: "rgba(74,222,128,0.14)",
      text: palette.success,
    },
    warning: {
      background: "rgba(246,179,37,0.14)",
      text: palette.secondary,
    },
    info: {
      background: "rgba(94,161,255,0.14)",
      text: palette.info,
    },
    neutral: {
      background: palette.surfaceVariant,
      text: palette.onSurfaceSoft,
    },
    error: {
      background: "rgba(255,102,102,0.14)",
      text: palette.error,
    },
  };

  return (
    <View
      style={[
        styles.statusChip,
        { backgroundColor: toneMap[tone].background },
      ]}>
      <Text style={[styles.statusChipText, { color: toneMap[tone].text }]}>
        {label}
      </Text>
    </View>
  );
}
