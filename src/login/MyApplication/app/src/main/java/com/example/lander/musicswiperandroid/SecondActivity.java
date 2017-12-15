package com.example.lander.musicswiperandroid;

import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.util.Log;
import android.widget.TextView;

public class SecondActivity extends AppCompatActivity {

    String OAuthToken = getIntent().getStringExtra("token");
    TextView tokenView;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_second);
        Log.d("SecondActivity", OAuthToken);

        tokenView = (TextView) findViewById(R.id.textView1);
        tokenView.setText(OAuthToken);
    }
}
