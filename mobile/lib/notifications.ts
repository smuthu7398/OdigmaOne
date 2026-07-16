import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "./api";

// show pushes as banners even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let registeredToken: string | null = null;

/** Ask permission, fetch the Expo push token and register it with the API.
 *  Safe to call repeatedly; quietly no-ops where push isn't available
 *  (simulators, Expo Go limitations). */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return; // simulators can't receive push

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#f26222",
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResult.data;
    if (!token || token === registeredToken) return;

    await api("/api/v1/push-tokens", {
      method: "POST",
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
    registeredToken = token;
    console.log("[push] registered", token);
  } catch (err) {
    // Expo Go without an EAS projectId lands here — the app still works,
    // only remote push is unavailable until we set up a dev build.
    console.log("[push] registration skipped:", (err as Error).message);
  }
}

/** Remove this device's token on sign-out. */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  try {
    await api("/api/v1/push-tokens", {
      method: "DELETE",
      body: JSON.stringify({ token: registeredToken }),
    });
  } catch {
    // best effort
  }
  registeredToken = null;
}
