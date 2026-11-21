import { LocalNotifications } from "@capacitor/local-notifications";

export async function testNotification() {
  try {
    let permission = await LocalNotifications.checkPermissions();

    if (permission.display !== "granted") {
      permission = await LocalNotifications.requestPermissions();
    }

    if (permission.display !== "granted") {
      alert("Please allow notification permission.");
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title: "TaskFlow Test 🔔",
          body: "Your Android notification is working!",
          id: 1001,
          schedule: {
            at: new Date(Date.now() + 10000),
            allowWhileIdle: true,
          },
        },
      ],
    });

    alert("Notification scheduled! Wait 10 seconds.");
  } catch (error) {
    console.error(error);
    alert("Notification error: " + error.message);
  }
}