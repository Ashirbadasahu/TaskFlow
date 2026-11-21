
package com.ashirbad.taskflow;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSArray;

import org.json.JSONObject;

@CapacitorPlugin(name = "TaskVoice")
public class TaskVoicePlugin extends Plugin {

    @PluginMethod
    public void scheduleVoiceReminders(PluginCall call) {
        try {
            JSArray reminders = call.getArray("reminders");

            if (reminders == null) {
                call.reject("Reminders list is missing");
                return;
            }

            Context context = getContext();
            AlarmManager alarmManager =
                    (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            cancelExistingAlarms(alarmManager, context);

            for (int i = 0; i < reminders.length(); i++) {
                JSONObject item = reminders.getJSONObject(i);

                long at = item.getLong("at");
                String message = item.getString("message");

                if (at <= System.currentTimeMillis()) continue;

                Intent intent = new Intent(context, TaskVoiceReceiver.class);
                intent.putExtra("message", message);

                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        30000 + i,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP,
                            at,
                            pendingIntent
                    );
                } else {
                    alarmManager.setExact(
                            AlarmManager.RTC_WAKEUP,
                            at,
                            pendingIntent
                    );
                }
            }

            call.resolve();
        } catch (Exception e) {
            call.reject("Voice reminder scheduling failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelVoiceReminders(PluginCall call) {
        try {
            Context context = getContext();
            AlarmManager alarmManager =
                    (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            cancelExistingAlarms(alarmManager, context);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not cancel voice reminders: " + e.getMessage());
        }
    }

    private void cancelExistingAlarms(
            AlarmManager alarmManager,
            Context context
    ) {
        for (int i = 0; i < 300; i++) {
            Intent intent = new Intent(context, TaskVoiceReceiver.class);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    30000 + i,
                    intent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );

            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
            }
        }
    }
}

