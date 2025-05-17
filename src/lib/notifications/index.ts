import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export const trySendNotification = async (
  ...args: Parameters<typeof sendNotification>
) => {
  // Do you have permission to send a notification?
  let permissionGranted = await isPermissionGranted();

  // If not we need to request it
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }

  // Once permission has been granted we can send the notification
  if (permissionGranted) {
    try {
      sendNotification(...args);
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
};
