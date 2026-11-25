package com.moread.markdown;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MoReadFilesPlugin.class);
        super.onCreate(savedInstanceState);
        MoReadFilesPlugin.captureIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        MoReadFilesPlugin.deliverIntent(intent);
    }
}
