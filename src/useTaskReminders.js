
import { useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const TaskVoice = registerPlugin("TaskVoice");

const STORAGE_KEY = "taskflow-reminders-enabled";

const NATIVE_ID_START = 20000;
const MAX_ALARMS = 300;

// Get only tasks that have a valid future custom alarm.
function getCustomAlarms(tasks) {
  const now = Date.now();

  return (tasks || [])
    .filter((task) => {
      if (!task.alarmDateTime) return false;
      if (task.status === "Completed") return false;

      const alarmTime = new Date(task.alarmDateTime).getTime();

      return Number.isFinite(alarmTime) && alarmTime > now;
    })
    .sort(
      (a, b) =>
        new Date(a.alarmDateTime).getTime() -
        new Date(b.alarmDateTime).getTime()
    );
}

function getTaskMessage(task) {
  const description = task.description
    ? ` ${task.description}`
    : "";

  return `TaskFlow reminder. Your task is ${task.title}.${description} Please complete it on time.`;
}

// Cancel previously scheduled TaskFlow notifications.
async function cancelNativeReminders() {
  const pending = await LocalNotifications.getPending();

  const remindersToCancel = pending.notifications
    .filter(
      (notification) =>
        notification.id >= NATIVE_ID_START &&
        notification.id < NATIVE_ID_START + MAX_ALARMS
    )
    .map((notification) => ({ id: notification.id }));

  if (remindersToCancel.length > 0) {
    await LocalNotifications.cancel({
      notifications: remindersToCancel,
    });
  }
}

// Cancel previously scheduled Android voice alarms.
async function cancelVoiceReminders() {
  await TaskVoice.cancelVoiceReminders();
}

// Schedule one notification and one voice alarm per task.
async function scheduleNativeReminders(tasks) {
  await cancelNativeReminders();
  await cancelVoiceReminders();

  const alarms = getCustomAlarms(tasks).slice(0, MAX_ALARMS);

  if (alarms.length === 0) {
    console.log("TaskFlow: No upcoming custom alarms.");
    return;
  }

  const notifications = [];
  const voiceReminders = [];

  alarms.forEach((task, index) => {
    const alarmTime = new Date(task.alarmDateTime);
    const timestamp = alarmTime.getTime();
    const message = getTaskMessage(task);

    notifications.push({
      id: NATIVE_ID_START + index,
      title: "TaskFlow - Task Reminder 🔔",
      body: `It's time to complete: ${task.title}`,
      schedule: {
        at: alarmTime,
        allowWhileIdle: true,
      },
    });

    voiceReminders.push({
      at: timestamp,
      message,
    });
  });

  if (notifications.length > 0) {
    await LocalNotifications.schedule({
      notifications,
    });
  }

  if (voiceReminders.length > 0) {
    await TaskVoice.scheduleVoiceReminders({
      reminders: voiceReminders,
    });
  }

  console.log("TaskFlow custom notifications:", notifications.length);
  console.log("TaskFlow custom voice alarms:", voiceReminders.length);
}

// Browser sound fallback.
function playReminderSound(audioContext) {
  if (!audioContext || audioContext.state !== "running") return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 880;

  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.15,
    audioContext.currentTime + 0.03
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    audioContext.currentTime + 0.35
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.4);
}

function speakReminder(message) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(message);
  speech.lang = "en-IN";
  speech.rate = 0.9;
  speech.pitch = 1;

  window.speechSynthesis.speak(speech);
}

export function useTaskReminders(tasks) {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  );

  const audioContextRef = useRef(null);
  const isNative = Capacitor.isNativePlatform();

  async function enableReminders() {
    try {
      if (isNative) {
        let permission = await LocalNotifications.checkPermissions();

        if (permission.display !== "granted") {
          permission = await LocalNotifications.requestPermissions();
        }

        if (permission.display !== "granted") {
          alert("Please allow notification permission in Android settings.");
          return;
        }

        localStorage.setItem(STORAGE_KEY, "true");
        setEnabled(true);

        alert("Custom task alarms enabled!");
        return;
      }

      if (!("Notification" in window)) {
        alert("Your browser does not support notifications.");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        alert("Please allow notifications in browser settings.");
        return;
      }

      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (AudioContextClass) {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        }

        await audioContextRef.current.resume();
      }

      localStorage.setItem(STORAGE_KEY, "true");
      setEnabled(true);

      new Notification("TaskFlow", {
        body: "Custom task alarms are enabled!",
      });
    } catch (error) {
      console.error("Enable reminders error:", error);
      alert("Could not enable reminders: " + error.message);
    }
  }

  async function disableReminders() {
    localStorage.setItem(STORAGE_KEY, "false");
    setEnabled(false);

    if (isNative) {
      try {
        await cancelNativeReminders();
        await cancelVoiceReminders();
      } catch (error) {
        console.error("Could not cancel reminders:", error);
      }
    } else {
      window.speechSynthesis?.cancel();
    }
  }

  // Android: reschedule alarms whenever tasks change.
  useEffect(() => {
    if (!isNative || !enabled) return;

    scheduleNativeReminders(tasks).catch((error) => {
      console.error("Native custom alarm error:", error);
    });
  }, [enabled, tasks, isNative]);

  // Browser: check custom alarms while the browser is open.
  useEffect(() => {
    if (isNative || !enabled) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    function checkCustomAlarms() {
      const now = Date.now();

      (tasks || []).forEach((task) => {
        if (!task.alarmDateTime) return;
        if (task.status === "Completed") return;

        const alarmTime = new Date(task.alarmDateTime).getTime();

        if (!Number.isFinite(alarmTime)) return;

        // Trigger during the first minute after the selected time.
        if (now < alarmTime || now >= alarmTime + 60000) return;

        const sentKey =
          `taskflow-custom-alarm-sent:${task.id}:${task.alarmDateTime}`;

        if (localStorage.getItem(sentKey) === "sent") return;

        const message = getTaskMessage(task);

        new Notification("TaskFlow - Task Reminder 🔔", {
          body: `It's time to complete: ${task.title}`,
        });

        playReminderSound(audioContextRef.current);
        speakReminder(message);

        localStorage.setItem(sentKey, "sent");
      });
    }

    checkCustomAlarms();

    const interval = setInterval(checkCustomAlarms, 5000);

    return () => clearInterval(interval);
  }, [enabled, tasks, isNative]);

  return {
    enabled,
    enableReminders,
    disableReminders,
  };
}
