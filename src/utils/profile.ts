import { AuthUser } from "../types/auth";

export function isProfileComplete(user: AuthUser | null) {
  if (!user) {
    return false;
  }

  const hasCoreProfile = Boolean(
    user.name.trim()
      && user.phone.trim()
      && user.license?.url
      && user.license.status !== "rejected",
  );

  if (user.role === "Owner") {
    return hasCoreProfile && user.documents.length > 0;
  }

  return hasCoreProfile;
}
