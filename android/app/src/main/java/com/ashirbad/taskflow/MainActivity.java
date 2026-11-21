
package com.ashirbad.taskflow;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(TaskVoicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
