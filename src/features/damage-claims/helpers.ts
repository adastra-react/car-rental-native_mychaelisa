import { DamageClaimRecord } from "../../types/damageClaim";

export function formatDamageClaimAmount(amount: number) {
  return `JMD ${amount.toLocaleString()}`;
}

export function formatDamageClaimDate(value?: string) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-JM", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getDamageClaimStatusCopy(status: DamageClaimRecord["status"]) {
  switch (status) {
    case "Submitted":
      return "Waiting on renter review during the dispute window.";
    case "Disputed":
      return "The renter disputed this claim and it now needs admin review.";
    case "Approved":
      return "Admin approved this claim.";
    case "Rejected":
      return "Admin rejected this claim.";
    default:
      return "Damage claim update";
  }
}

export function canDisputeDamageClaim(
  claim: DamageClaimRecord | null | undefined,
  userId: string | null | undefined,
) {
  if (!claim || !userId || claim.renterId !== userId) {
    return false;
  }

  if (claim.status === "Approved" || claim.status === "Rejected") {
    return false;
  }

  if (claim.disputeReason) {
    return false;
  }

  const disputeDeadline = new Date(claim.disputeWindowEndsAt);
  if (Number.isNaN(disputeDeadline.getTime())) {
    return false;
  }

  return disputeDeadline.getTime() >= Date.now();
}
