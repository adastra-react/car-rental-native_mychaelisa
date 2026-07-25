import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";

import { AppStackParamList } from "../AppNavigator";
import {
  deleteSupportingDocument,
  fetchCurrentUser,
  saveProfile,
  uploadLicense,
  uploadSupportingDocument,
} from "../services/auth";
import { AppDispatch, RootState } from "../store";
import { signOut, updateUser } from "../store/authSlice";
import { isProfileComplete } from "../utils/profile";
import { pickUploadAsset } from "../utils/uploadPicker";

type Props = NativeStackScreenProps<AppStackParamList, "ProfileSetup">;

export default function ProfileSetupScreen({ navigation }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const user = useSelector((state: RootState) => state.auth.user);
  const isOwner = user?.role === "Owner";
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [documentLabel, setDocumentLabel] = useState("Vehicle registration");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [removingDocumentId, setRemovingDocumentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setBio(user?.bio ?? "");
  }, [user]);

  useEffect(() => {
    if (!token || user) {
      return;
    }

    let isMounted = true;

    fetchCurrentUser(token)
      .then((response) => {
        if (isMounted) {
          dispatch(updateUser(response.user));
        }
      })
      .catch((err) => {
        if (isMounted) {
          setProfileError(
            err instanceof Error
              ? err.message
              : "Unable to load your account details.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch, token, user]);

  const completionItems = useMemo(
    () =>
      [
        {
          label: "Profile basics",
          complete: Boolean(name.trim() && phone.trim()),
        },
        {
          label: "Driver's license uploaded",
          complete: Boolean(user?.license?.url && user.license.status !== "rejected"),
        },
        isOwner
          ? {
              label: "Owner document uploaded",
              complete: Boolean(user?.documents.length),
            }
          : null,
      ].filter(Boolean) as Array<{ label: string; complete: boolean }>,
    [isOwner, name, phone, user],
  );

  const profileDirty =
    name !== (user?.name ?? "")
    || phone !== (user?.phone ?? "")
    || bio !== (user?.bio ?? "");

  const onSaveProfile = async () => {
    if (!token) {
      setProfileError("You are not signed in.");
      return;
    }

    if (!name.trim() || !phone.trim()) {
      setProfileError("Name and phone are required.");
      return;
    }

    setSaving(true);
    setProfileError(null);

    try {
      const response = await saveProfile(token, {
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      });
      dispatch(updateUser(response.user));
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Unable to save your profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onUploadLicense = async () => {
    if (!token) {
      setUploadError("You are not signed in.");
      return;
    }

    try {
      const asset = await pickUploadAsset({
        includeDocuments: true,
        title: "Upload driver's license",
      });
      if (!asset) {
        return;
      }

      setLicenseUploading(true);
      setUploadError(null);

      const response = await uploadLicense(token, asset);
      dispatch(updateUser(response.user));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Unable to upload your license.",
      );
    } finally {
      setLicenseUploading(false);
    }
  };

  const onUploadDocument = async () => {
    if (!token) {
      setUploadError("You are not signed in.");
      return;
    }

    if (!documentLabel.trim()) {
      setUploadError("Add a label for the document you are uploading.");
      return;
    }

    try {
      const asset = await pickUploadAsset({
        includeDocuments: true,
        title: "Upload supporting document",
      });
      if (!asset) {
        return;
      }

      setDocumentUploading(true);
      setUploadError(null);

      const response = await uploadSupportingDocument(
        token,
        asset,
        documentLabel.trim(),
      );
      dispatch(updateUser(response.user));
      setDocumentLabel("Vehicle registration");
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Unable to upload that supporting document.",
      );
    } finally {
      setDocumentUploading(false);
    }
  };

  const onRemoveDocument = async (documentId?: string) => {
    if (!token || !documentId) {
      return;
    }

    try {
      setRemovingDocumentId(documentId);
      const response = await deleteSupportingDocument(token, documentId);
      dispatch(updateUser(response.user));
    } catch (err) {
      Alert.alert(
        "Unable to remove document",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setRemovingDocumentId(null);
    }
  };

  const complete = isProfileComplete(user);
  const licenseStatusLabel = !user?.license?.url
    ? "No license uploaded yet"
    : user.license.status === "verified"
      ? "License verified"
      : user.license.status === "rejected"
        ? "License rejected. Please upload a clearer valid driver's license."
        : "License uploaded and pending verification";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Included Features MVP</Text>
        <Text style={styles.title}>User authentication and profiles</Text>
        <Text style={styles.subtitle}>
          Same black-and-green visual system as the in-app profile, now applied
          to setup and onboarding too.
        </Text>

        <View style={styles.heroCard}>
          <View style={styles.identityBlock}>
            <Text style={styles.email}>{user?.email ?? "No email loaded"}</Text>
            <Text style={styles.rolePill}>{user?.role ?? "Renter"}</Text>
          </View>
          <Text style={styles.helperText}>
            {isOwner
              ? "Owners need profile basics, a license, and at least one supporting vehicle document."
              : "Renters only need their profile basics and driver's license."}
          </Text>
          <Pressable
            style={styles.heroLogoutButton}
            onPress={() => dispatch(signOut())}
          >
            <Text style={styles.heroLogoutText}>Log out</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completion checklist</Text>
          {completionItems.map((item) => (
            <View key={item.label} style={styles.checkRow}>
              <View
                style={[
                  styles.checkDot,
                  item.complete && styles.checkDotComplete,
                ]}
              />
              <Text style={styles.checkLabel}>{item.label}</Text>
              <Text style={styles.checkState}>
                {item.complete ? "Done" : "Pending"}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile details</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#6F767E"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setProfileError(null);
            }}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor="#6F767E"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setProfileError(null);
            }}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Short bio"
            placeholderTextColor="#6F767E"
            multiline
            numberOfLines={4}
            value={bio}
            onChangeText={(value) => {
              setBio(value);
              setProfileError(null);
            }}
          />

          {profileError ? <Text style={styles.error}>{profileError}</Text> : null}

          <Pressable
            style={[
              styles.primaryButton,
              (saving || !profileDirty) && styles.buttonDisabled,
            ]}
            onPress={onSaveProfile}
            disabled={saving || !profileDirty}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {profileDirty ? "Save profile" : "Profile saved"}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver's license</Text>
          <Text style={styles.helperText}>
            Pick a photo from your gallery or choose an image or PDF from Files.
          </Text>
          {user?.license?.url ? (
            <Text
              style={
                user.license.status === "rejected"
                  ? styles.error
                  : user.license.status === "verified"
                    ? styles.uploadedText
                    : styles.pendingVerificationText
              }
            >
              {licenseStatusLabel}
            </Text>
          ) : (
            <Text style={styles.pendingText}>{licenseStatusLabel}</Text>
          )}
          {user?.license?.status === "rejected" && user.license.rejectionReason ? (
            <Text style={styles.pendingText}>{user.license.rejectionReason}</Text>
          ) : null}
          {uploadError ? <Text style={styles.error}>{uploadError}</Text> : null}
          <Pressable
            style={[styles.secondaryButton, licenseUploading && styles.buttonDisabled]}
            onPress={onUploadLicense}
            disabled={licenseUploading}
          >
            {licenseUploading ? (
              <ActivityIndicator color="#274c77" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {user?.license?.url ? "Replace license" : "Upload license"}
              </Text>
            )}
          </Pressable>
          {user?.license?.url ? (
            <Pressable
              style={styles.licenseLinkButton}
              onPress={() => void Linking.openURL(user.license!.url)}
            >
              <Text style={styles.licenseLinkText}>View uploaded license</Text>
            </Pressable>
          ) : null}
        </View>

        {isOwner ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supporting documents</Text>
            <Text style={styles.helperText}>
              Choose an image from your gallery or upload an image or PDF from Files.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Document label"
              placeholderTextColor="#6F767E"
              value={documentLabel}
              onChangeText={(value) => {
                setDocumentLabel(value);
                setUploadError(null);
              }}
            />
            <Pressable
              style={[
                styles.secondaryButton,
                documentUploading && styles.buttonDisabled,
              ]}
              onPress={onUploadDocument}
              disabled={documentUploading}
            >
              {documentUploading ? (
                <ActivityIndicator color="#274c77" />
              ) : (
                <Text style={styles.secondaryButtonText}>Upload document</Text>
              )}
            </Pressable>

            <View style={styles.documentsList}>
              {(user?.documents ?? []).map((document) => (
                <View
                  key={document._id || document.public_id}
                  style={styles.documentCard}
                >
                  <View style={styles.documentTextBlock}>
                    <Text style={styles.documentTitle}>
                      {document.label || "Supporting document"}
                    </Text>
                    <Text style={styles.documentMeta}>{document.public_id}</Text>
                  </View>
                  <Pressable
                    onPress={() => onRemoveDocument(document._id)}
                    disabled={removingDocumentId === document._id}
                  >
                    <Text style={styles.removeText}>
                      {removingDocumentId === document._id
                        ? "Removing..."
                        : "Remove"}
                    </Text>
                  </Pressable>
                </View>
              ))}

              {!user?.documents?.length ? (
                <Text style={styles.pendingText}>
                  No supporting documents uploaded yet.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <Pressable
            style={[
              styles.primaryButton,
              !complete && styles.buttonDisabled,
              styles.flexButton,
            ]}
            onPress={() => navigation.navigate("Home")}
            disabled={!complete}
          >
            <Text style={styles.primaryButtonText}>Continue to app preview</Text>
          </Pressable>
          <Pressable
            style={[styles.ghostButton, styles.flexButton]}
            onPress={() => dispatch(signOut())}
          >
            <Text style={styles.ghostButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#050505",
  },
  container: {
    padding: 20,
    paddingBottom: 32,
    backgroundColor: "#050505",
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#20E6A4",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F5F7FA",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 22,
    color: "#8A8F98",
  },
  heroCard: {
    marginTop: 18,
    backgroundColor: "#111111",
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1C1C1C",
  },
  identityBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  email: {
    flex: 1,
    color: "#F5F7FA",
    fontSize: 18,
    fontWeight: "600",
  },
  rolePill: {
    color: "#07120D",
    backgroundColor: "#20E6A4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    fontWeight: "700",
  },
  section: {
    marginTop: 18,
    backgroundColor: "#111111",
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1C1C1C",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F5F7FA",
    marginBottom: 12,
  },
  helperText: {
    color: "#8A8F98",
    lineHeight: 20,
    marginTop: 8,
  },
  heroLogoutButton: {
    alignSelf: "flex-start",
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2B2B2B",
    backgroundColor: "#181818",
  },
  heroLogoutText: {
    color: "#FF746C",
    fontSize: 14,
    fontWeight: "700",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  checkDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#3B3B3B",
    marginRight: 10,
  },
  checkDotComplete: {
    backgroundColor: "#20E6A4",
  },
  checkLabel: {
    flex: 1,
    color: "#E8ECEF",
    fontSize: 15,
  },
  checkState: {
    color: "#8A8F98",
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#2B2B2B",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: "#F5F7FA",
    backgroundColor: "#181818",
    marginBottom: 14,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  error: {
    color: "#FF746C",
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: "#20E6A4",
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#07120D",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#2F4B42",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#20E6A4",
    fontSize: 15,
    fontWeight: "700",
  },
  licenseLinkButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingVertical: 4,
  },
  licenseLinkText: {
    color: "#20E6A4",
    fontSize: 14,
    fontWeight: "700",
  },
  ghostButton: {
    borderWidth: 1,
    borderColor: "#2B2B2B",
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
  ghostButtonText: {
    color: "#B8BDC7",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  uploadedText: {
    color: "#20E6A4",
    fontWeight: "600",
  },
  pendingVerificationText: {
    color: "#F6B325",
    fontWeight: "600",
  },
  pendingText: {
    color: "#8A8F98",
    marginTop: 6,
  },
  documentsList: {
    marginTop: 14,
    gap: 10,
  },
  documentCard: {
    borderWidth: 1,
    borderColor: "#232323",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#181818",
  },
  documentTextBlock: {
    flex: 1,
  },
  documentTitle: {
    color: "#F5F7FA",
    fontWeight: "700",
    marginBottom: 4,
  },
  documentMeta: {
    color: "#6F767E",
    fontSize: 12,
  },
  removeText: {
    color: "#FF746C",
    fontWeight: "700",
  },
  footerRow: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },
  flexButton: {
    flex: 1,
  },
});
