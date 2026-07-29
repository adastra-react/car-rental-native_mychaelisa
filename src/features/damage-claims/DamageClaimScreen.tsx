import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { UploadAsset } from "../../services/auth";
import { pickUploadAssets } from "../../utils/uploadPicker";
import type { UserRole } from "../../types/auth";
import type { DamageClaimRecord } from "../../types/damageClaim";
import { colors, radii, spacing, typography } from "../../theme/tokens";
import {
  canDisputeDamageClaim,
  formatDamageClaimAmount,
  formatDamageClaimDate,
  getDamageClaimStatusCopy,
} from "./helpers";

const palette = colors.dark;

type TripLike = {
  id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
};

type Props = {
  trip: TripLike;
  claim?: DamageClaimRecord | null;
  currentUserId: string | null;
  currentUserRole?: UserRole | null;
  onBack: () => void;
  onSubmitClaim: (payload: {
    description: string;
    claimedAmount: number;
    photos: UploadAsset[];
  }) => Promise<void>;
  onSubmitDispute: (disputeReason: string) => Promise<void>;
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function InfoCard({
  icon,
  tone = palette.primary,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.infoCard}>
      <Ionicons name={icon} size={18} color={tone} />
      <Text style={styles.infoCardText}>{children}</Text>
    </View>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
      onPress={onPress}
      disabled={disabled}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function DamageClaimScreen({
  trip,
  claim,
  currentUserId,
  currentUserRole,
  onBack,
  onSubmitClaim,
  onSubmitDispute,
}: Props) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [photos, setPhotos] = useState<UploadAsset[]>([]);
  const [disputeReason, setDisputeReason] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const canDispute = useMemo(
    () => canDisputeDamageClaim(claim, currentUserId),
    [claim, currentUserId],
  );
  const isOwnerView = currentUserRole === "Owner";

  const claimPhotos = claim?.photos ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <OverlayHeader
          title={claim ? "Damage claim" : "Report damage"}
          onBack={onBack}
        />

        <InfoCard
          icon={claim ? "shield-checkmark-outline" : "information-circle-outline"}
          tone={claim ? palette.secondary : palette.primary}>
          {claim
            ? getDamageClaimStatusCopy(claim.status)
            : "Upload photo evidence and a clear description. The renter gets notified and can dispute within the app before admin review."}
        </InfoCard>

        <SectionTitle>Trip</SectionTitle>
        <View style={styles.card}>
          <SummaryRow label='Vehicle' value={trip.title} />
          <SummaryRow label='Location' value={trip.location} />
          <SummaryRow
            label='Window'
            value={`${trip.startDate} to ${trip.endDate}`}
          />
        </View>

        {claim ? (
          <>
            <SectionTitle>Claim summary</SectionTitle>
            <View style={styles.card}>
              <SummaryRow label='Status' value={claim.status} />
              <SummaryRow
                label='Claim amount'
                value={formatDamageClaimAmount(claim.claimedAmount)}
              />
              <SummaryRow
                label='Dispute deadline'
                value={formatDamageClaimDate(claim.disputeWindowEndsAt)}
              />
              {claim.reviewedAt ? (
                <SummaryRow
                  label='Reviewed'
                  value={formatDamageClaimDate(claim.reviewedAt)}
                />
              ) : null}
              {claim.chargeStatus === "Triggered" ? (
                <SummaryRow
                  label='Charge status'
                  value='Charge action recorded'
                />
              ) : null}
            </View>

            <SectionTitle>Description</SectionTitle>
            <View style={styles.card}>
              <Text style={styles.bodyText}>{claim.description}</Text>
            </View>

            <SectionTitle>Photo evidence</SectionTitle>
            <View style={styles.photoGrid}>
              {claimPhotos.map((photo) => (
                <Image
                  key={photo.public_id}
                  source={{ uri: photo.url }}
                  style={styles.photoPreview}
                />
              ))}
            </View>

            {claim.disputeReason ? (
              <>
                <SectionTitle>Dispute</SectionTitle>
                <View style={styles.card}>
                  <Text style={styles.bodyText}>{claim.disputeReason}</Text>
                </View>
              </>
            ) : null}

            {claim.adminReviewNote ? (
              <>
                <SectionTitle>Admin note</SectionTitle>
                <View style={styles.card}>
                  <Text style={styles.bodyText}>{claim.adminReviewNote}</Text>
                </View>
              </>
            ) : null}

            {canDispute ? (
              <>
                <SectionTitle>Dispute this claim</SectionTitle>
                <TextInput
                  value={disputeReason}
                  onChangeText={setDisputeReason}
                  placeholder='Explain why you disagree with this claim.'
                  placeholderTextColor={palette.onSurfaceVariant}
                  multiline
                  style={[styles.input, styles.textArea]}
                  selectionColor={palette.primary}
                />
                <PrimaryButton
                  label={submittingDispute ? "Sending..." : "Submit dispute"}
                  disabled={!disputeReason.trim() || submittingDispute}
                  onPress={() => {
                    setSubmittingDispute(true);
                    setErrorText(null);
                    void onSubmitDispute(disputeReason.trim())
                      .then(() => {
                        setDisputeReason("");
                      })
                      .catch((error) => {
                        setErrorText(
                          error instanceof Error
                            ? error.message
                            : "Unable to submit the dispute right now.",
                        );
                      })
                      .finally(() => {
                        setSubmittingDispute(false);
                      });
                  }}
                />
              </>
            ) : null}
          </>
        ) : isOwnerView ? (
          <>
            <SectionTitle>Damage description</SectionTitle>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder='Describe the issue, when it was discovered, and how it affected the vehicle.'
              placeholderTextColor={palette.onSurfaceVariant}
              multiline
              style={[styles.input, styles.textArea]}
              selectionColor={palette.primary}
            />

            <SectionTitle>Claim amount (JMD)</SectionTitle>
            <TextInput
              value={amount}
              onChangeText={(value) => setAmount(value.replace(/[^\d]/g, ""))}
              placeholder='e.g. 22000'
              placeholderTextColor={palette.onSurfaceVariant}
              keyboardType='number-pad'
              style={styles.input}
              selectionColor={palette.primary}
            />

            <SectionTitle>Photo evidence</SectionTitle>
            <View style={styles.photoGrid}>
              {photos.map((photo) => (
                <Image
                  key={photo.uri}
                  source={{ uri: photo.uri }}
                  style={styles.photoPreview}
                />
              ))}
            </View>
            <SecondaryButton
              label={photos.length ? "Add more photos" : "Choose photos"}
              onPress={() => {
                setErrorText(null);
                void pickUploadAssets({
                  allowMultiple: true,
                  maxSelections: 6,
                  title: "Choose damage evidence",
                })
                  .then((assets) => {
                    if (!assets?.length) {
                      return;
                    }

                    setPhotos((current) => {
                      const next = [...current, ...assets];
                      return next.slice(0, 6);
                    });
                  })
                  .catch((error) => {
                    setErrorText(
                      error instanceof Error
                        ? error.message
                        : "Unable to open the photo picker.",
                    );
                  });
              }}
            />

            <PrimaryButton
              label={submittingClaim ? "Submitting..." : "Submit claim"}
              disabled={
                !description.trim() ||
                !amount.trim() ||
                photos.length === 0 ||
                submittingClaim
              }
              onPress={() => {
                const claimedAmount = Number(amount);
                if (!Number.isFinite(claimedAmount) || claimedAmount <= 0) {
                  setErrorText("Claim amount must be greater than zero.");
                  return;
                }

                setSubmittingClaim(true);
                setErrorText(null);
                void onSubmitClaim({
                  description: description.trim(),
                  claimedAmount,
                  photos,
                })
                  .then(() => {
                    setDescription("");
                    setAmount("");
                    setPhotos([]);
                  })
                  .catch((error) => {
                    setErrorText(
                      error instanceof Error
                        ? error.message
                        : "Unable to submit the damage claim right now.",
                    );
                  })
                  .finally(() => {
                    setSubmittingClaim(false);
                  });
              }}
            />
          </>
        ) : (
          <InfoCard icon='hourglass-outline' tone={palette.info}>
            No damage claim has been filed for this booking.
          </InfoCard>
        )}

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
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
  sectionTitle: {
    color: palette.onSurface,
    ...typography.titleLarge,
  },
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.outline,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
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
    ...typography.labelLarge,
    textAlign: "right",
  },
  bodyText: {
    color: palette.onSurface,
    ...typography.bodyMedium,
  },
  input: {
    backgroundColor: palette.surface,
    borderColor: palette.outline,
    borderRadius: radii.xl,
    borderWidth: 1,
    color: palette.onSurface,
    ...typography.bodyLarge,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  textArea: {
    minHeight: 144,
    textAlignVertical: "top",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  photoPreview: {
    borderRadius: radii.lg,
    height: 96,
    width: 96,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.primary,
    borderRadius: radii.xl,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: palette.onPrimary,
    ...typography.titleLarge,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.outline,
    borderRadius: radii.xl,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.xl,
  },
  secondaryButtonText: {
    color: palette.onSurface,
    ...typography.titleMedium,
  },
  errorText: {
    color: palette.error,
    ...typography.bodySmall,
  },
});
