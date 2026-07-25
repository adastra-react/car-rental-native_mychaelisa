import { Alert, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import type { UploadAsset } from "../services/auth";

type PickUploadAssetsOptions = {
  allowMultiple?: boolean;
  includeDocuments?: boolean;
  maxSelections?: number;
  title?: string;
};

type UploadSource = "gallery" | "files";

function buildUploadAssetFromLibrary(
  asset: ImagePicker.ImagePickerAsset,
  index: number,
): UploadAsset {
  const extension = asset.mimeType?.split("/")[1] || "jpg";
  return {
    uri: asset.uri,
    name: asset.fileName || `image-${Date.now()}-${index}.${extension}`,
    mimeType: asset.mimeType || "image/jpeg",
  };
}

function buildUploadAssetFromFile(
  asset: DocumentPicker.DocumentPickerAsset,
): UploadAsset {
  return {
    uri: asset.uri,
    name: asset.name || `file-${Date.now()}`,
    mimeType: asset.mimeType || "application/octet-stream",
  };
}

function chooseUploadSource(title?: string): Promise<UploadSource | null> {
  if (Platform.OS === "web") {
    return Promise.resolve("files");
  }

  return new Promise((resolve) => {
    Alert.alert(
      title || "Choose upload source",
      "Pick from your photo library or browse Files.",
      [
        {
          text: "Gallery",
          onPress: () => resolve("gallery"),
        },
        {
          text: "Files",
          onPress: () => resolve("files"),
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => resolve(null),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolve(null),
      },
    );
  });
}

async function pickFromGallery(options: PickUploadAssetsOptions) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library access is required to choose from your gallery.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: Boolean(options.allowMultiple),
    selectionLimit: options.maxSelections ?? 8,
    quality: 1,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets.map(buildUploadAssetFromLibrary);
}

async function pickFromFiles(options: PickUploadAssetsOptions) {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: Boolean(options.allowMultiple),
    type: options.includeDocuments ? ["image/*", "application/pdf"] : ["image/*"],
  });

  if (result.canceled) {
    return null;
  }

  return result.assets.map(buildUploadAssetFromFile);
}

export async function pickUploadAssets(
  options: PickUploadAssetsOptions = {},
): Promise<UploadAsset[] | null> {
  const source = await chooseUploadSource(options.title);
  if (!source) {
    return null;
  }

  if (source === "gallery") {
    return pickFromGallery(options);
  }

  return pickFromFiles(options);
}

export async function pickUploadAsset(
  options: PickUploadAssetsOptions = {},
): Promise<UploadAsset | null> {
  const assets = await pickUploadAssets(options);
  return assets?.[0] ?? null;
}
