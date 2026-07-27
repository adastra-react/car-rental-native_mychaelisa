import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

function hasGrantedNotificationPermission(
  permissions: Notifications.NotificationPermissionsStatus,
) {
  if (Platform.OS === "ios") {
    return (
      permissions.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      permissions.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
    );
  }

  return permissions.status === "granted";
}

export async function ensureNotificationPermissionsAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#20E6A4",
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let hasPermission = hasGrantedNotificationPermission(existingPermissions);

  if (!hasPermission) {
    const requestedPermissions = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    hasPermission = hasGrantedNotificationPermission(requestedPermissions);
  }

  if (!hasPermission) {
    throw new Error("Push notification permission was not granted.");
  }
}

export async function registerForPushNotificationsAsync() {
  await ensureNotificationPermissionsAsync();

  if (!Device.isDevice) {
    return null;
  }

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    undefined;

  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return tokenResponse.data;
}

export async function scheduleLocalDemoNotificationAsync({
  title,
  body,
  data,
}: {
  title: string;
  body: string;
  data?: Record<string, string | boolean | undefined>;
}) {
  await ensureNotificationPermissionsAsync();

  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      data,
    },
    trigger: null,
  });
}

export { Notifications };
