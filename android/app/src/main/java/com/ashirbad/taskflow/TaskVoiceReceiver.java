
package com.ashirbad.taskflow;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import java.util.Locale;

public class TaskVoiceReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {

        String message = intent.getStringExtra("message");

        if (message == null || message.trim().isEmpty()) {
            message = "You have pending tasks. Please check TaskFlow.";
        }

        final String speechMessage = message;
        final PendingResult result = goAsync();
        final TextToSpeech[] ttsHolder = new TextToSpeech[1];

        ttsHolder[0] = new TextToSpeech(
                context.getApplicationContext(),
                status -> {

                    TextToSpeech tts = ttsHolder[0];

                    if (status == TextToSpeech.SUCCESS && tts != null) {

                        int languageResult = tts.setLanguage(Locale.US);

                        if (languageResult == TextToSpeech.LANG_MISSING_DATA ||
                                languageResult == TextToSpeech.LANG_NOT_SUPPORTED) {

                            tts.shutdown();
                            result.finish();
                            return;
                        }

                        tts.setOnUtteranceProgressListener(
                                new UtteranceProgressListener() {

                                    @Override
                                    public void onStart(String id) {
                                    }

                                    @Override
                                    public void onDone(String id) {
                                        tts.shutdown();
                                        result.finish();
                                    }

                                    @Override
                                    public void onError(String id) {
                                        tts.shutdown();
                                        result.finish();
                                    }
                                }
                        );

                        int speakResult = tts.speak(
                                speechMessage,
                                TextToSpeech.QUEUE_FLUSH,
                                null,
                                "taskflow_voice"
                        );

                        if (speakResult == TextToSpeech.ERROR) {
                            tts.shutdown();
                            result.finish();
                        }

                    } else {

                        if (tts != null) {
                            tts.shutdown();
                        }

                        result.finish();
                    }
                }
        );
    }
}
