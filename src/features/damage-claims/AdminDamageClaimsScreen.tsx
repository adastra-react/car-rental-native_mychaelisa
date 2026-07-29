import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { DamageClaimRecord } from "../../types/damageClaim";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import { formatDamageClaimAmount, formatDamageClaimDate } from "./helpers";

const palette = colors.dark;

type Props = {
  claims: DamageClaimRecord[];
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  onBack: () => void;
  onReviewClaim: (
    claimId: string,
    decision: "Approved" | "Rejected",
  ) => Promise<void>;
  onTriggerCharge: (claimId: string) => Promise<void>;
};

function OverlayHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Ionicons name='chevron-back' size={20} color={palette.onSurface} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.backButtonGhost} />
    </View>
  );
}

function ActionButton({
  label,
  tone = "secondary",
  disabled = false,
  onPress,
}: {
  label: string;
  tone?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.actionButton,
        tone === "primary" && styles.actionButtonPrimary,
        tone === "danger" && styles.actionButtonDanger,
        disabled && styles.actionButtonDisabled,
      ]}
      disabled={disabled}
      onPress={onPress}>
      <Text
        style={[
          styles.actionButtonText,
          tone === "primary" && styles.actionButtonTextPrimary,
          tone === "danger" && styles.actionButtonTextDanger,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatusPill({ claim }: { claim: DamageClaimRecord }) {
  const label =
    claim.status === "Approved" && claim.chargeStatus === "Triggered"
      ? "Charged"
      : claim.status;
  const toneStyle =
    claim.status === "Approved"
      ? styles.statusSuccess
      : claim.status === "Rejected"
        ? styles.statusDanger
        : styles.statusWarning;

  return (
    <View style={[styles.statusPill, toneStyle]}>
      <Text style={styles.statusPillText}>{label}</Text>
    </View>
  );
}

export function AdminDamageClaimsScreen({
  claims,
  loading,
  error,
  isAdmin,
  onBack,
  onReviewClaim,
  onTriggerCharge,
}: Props) {
  const actionableClaims = useMemo(
    () =>
      claims.filter(
        (claim) =>
          claim.status === "Submitted" ||
          claim.status === "Disputed" ||
          (claim.status === "Approved" && claim.chargeStatus !== "Triggered"),
      ),
    [claims],
  );
  const [busyClaimId, setBusyClaimId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <OverlayHeader title='Damage claims' onBack={onBack} />

      <View style={styles.infoCard}>
        <Ionicons name='shield-half-outline' size={18} color={palette.primary} />
        <Text style={styles.infoCardText}>
          Review submitted or disputed post-trip claims here. Approved claims can
          also record the renter charge action until card processing is added.
        </Text>
      </View>

      {!isAdmin ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Admin access required</Text>
          <Text style={styles.emptyBody}>
            This review queue is only available to admin accounts.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Loading claims…</Text>
          <Text style={styles.emptyBody}>
            Pulling the latest post-trip claim activity from the server.
          </Text>
        </View>
      ) : error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Unable to load claims</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !actionableClaims.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No open damage claims</Text>
          <Text style={styles.emptyBody}>
            Submitted, disputed, and approved claims that still need a charge
            action will appear here.
          </Text>
        </View>
      ) : (
        actionableClaims.map((claim) => {
          const isBusy = busyClaimId === claim.id;
          return (
            <View key={claim.id} style={styles.claimCard}>
              <View style={styles.claimHeader}>
                <View style={styles.claimHeaderText}>
                  <Text style={styles.claimTitle}>{claim.vehicleTitle}</Text>
                  <Text style={styles.claimMeta}>
                    {claim.vehicleLocation || "Location pending"} ·{" "}
                    {formatDamageClaimDate(claim.createdAt || claim.disputeWindowEndsAt)}
                  </Text>
                </View>
                <StatusPill claim={claim} />
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Claim amount</Text>
                  <Text style={styles.summaryValue}>
                    {formatDamageClaimAmount(claim.claimedAmount)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Booking window</Text>
                  <Text style={styles.summaryValue}>
                    {claim.bookingStartDate && claim.bookingEndDate
                      ? `${formatDamageClaimDate(claim.bookingStartDate)} to ${formatDamageClaimDate(claim.bookingEndDate)}`
                      : "Not attached"}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Dispute deadline</Text>
                  <Text style={styles.summaryValue}>
                    {formatDamageClaimDate(claim.disputeWindowEndsAt)}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.bodyText}>{claim.description}</Text>

              {claim.disputeReason ? (
                <>
                  <Text style={styles.sectionTitle}>Renter dispute</Text>
                  <Text style={styles.bodyText}>{claim.disputeReason}</Text>
                </>
              ) : null}

              {claim.status === "Approved" && claim.chargeStatus !== "Triggered" ? (
                <ActionButton
                  label={isBusy && busyAction === "charge" ? "Recording…" : "Record charge action"}
                  tone='primary'
                  disabled={isBusy}
                  onPress={() => {
                    setBusyClaimId(claim.id);
                    setBusyAction("charge");
                    void onTriggerCharge(claim.id).finally(() => {
                      setBusyClaimId(null);
                      setBusyAction(null);
                    });
                  }}
                />
              ) : claim.status === "Submitted" || claim.status === "Disputed" ? (
                <View style={styles.actionRow}>
                  <ActionButton
                    label={isBusy && busyAction === "approve" ? "Approving…" : "Approve"}
                    tone='primary'
                    disabled={isBusy}
                    onPress={() => {
                      setBusyClaimId(claim.id);
                      setBusyAction("approve");
                      void onReviewClaim(claim.id, "Approved").finally(() => {
                        setBusyClaimId(null);
                        setBusyAction(null);
                      });
                    }}
                  />
                  <ActionButton
                    label={isBusy && busyAction === "reject" ? "Rejecting…" : "Reject"}
                    tone='danger'
                    disabled={isBusy}
                    onPress={() => {
                      setBusyClaimId(claim.id);
                      setBusyAction("reject");
                      void onReviewClaim(claim.id, "Rejected").finally(() => {
                        setBusyClaimId(null);
                        setBusyAction(null);
                      });
                    }}
                  />
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.outline,
    borderRadius: radii.lg,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  backButtonGhost: {
    width: 48,
  },
  headerTitle: {
    color: palette.onSurface,
    ...typography.headlineSmall,
  },
  infoCard: {
    alignItems: "flex-start",
    backgroundColor: palette.surface,
    borderColor: palette.outline,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  infoCardText: {
    color: palette.onSurfaceVariant,
    flex: 1,
    ...typography.bodyMedium,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderColor: palette.outline,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  emptyTitle: {
    color: palette.onSurface,
    ...typography.titleLarge,
  },
  emptyBody: {
    color: palette.onSurfaceVariant,
    ...typography.bodyMedium,
  },
  errorText: {
    color: palette.error,
    ...typography.bodyMedium,
  },
  claimCard: {
    backgroundColor: palette.surface,
    borderColor: palette.outline,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  claimHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  claimHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  claimTitle: {
    color: palette.onSurface,
    ...typography.titleLarge,
  },
  claimMeta: {
    color: palette.onSurfaceVariant,
    ...typography.bodySmall,
  },
  statusPill: {
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusSuccess: {
    backgroundColor: "rgba(74, 222, 128, 0.16)",
  },
  statusWarning: {
    backgroundColor: "rgba(246, 179, 37, 0.16)",
  },
  statusDanger: {
    backgroundColor: "rgba(255, 102, 102, 0.16)",
  },
  statusPillText: {
    color: palette.onSurface,
    ...typography.labelLarge,
  },
  summaryCard: {
    backgroundColor: palette.surfaceVariant,
    borderRadius: radii.lg,
    gap: spacing.sm,
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: palette.onSurfaceVariant,
    flex: 1,
    ...typography.bodySmall,
  },
  summaryValue: {
    color: palette.onSurface,
    flex: 1,
    textAlign: "right",
    ...typography.labelLarge,
  },
  sectionTitle: {
    color: palette.onSurfaceSoft,
    ...typography.labelLarge,
  },
  bodyText: {
    color: palette.onSurface,
    ...typography.bodyMedium,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: palette.surfaceVariant,
    borderRadius: radii.xl,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  actionButtonPrimary: {
    backgroundColor: palette.primary,
  },
  actionButtonDanger: {
    backgroundColor: "rgba(255, 102, 102, 0.18)",
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: palette.onSurface,
    ...typography.titleMedium,
  },
  actionButtonTextPrimary: {
    color: palette.onPrimary,
  },
  actionButtonTextDanger: {
    color: palette.error,
  },
});
