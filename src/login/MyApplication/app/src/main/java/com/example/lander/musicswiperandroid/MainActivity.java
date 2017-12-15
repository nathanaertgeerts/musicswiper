package com.example.lander.musicswiperandroid;

import android.net.Uri;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import com.spotify.sdk.android.authentication.AuthenticationClient;
import com.spotify.sdk.android.authentication.AuthenticationRequest;
import com.spotify.sdk.android.authentication.AuthenticationResponse;


public class MainActivity extends AppCompatActivity {

    private static final String CLIENT_ID = "3df1b4ea065f49a7809146d7a1584fd4";
    private static final String REDIRECT_URI = "http://172.16.152.140:3000/callback";

    private String logToken = "";
    private String logError = "";


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        AuthenticationRequest.Builder builder =
                new AuthenticationRequest.Builder(CLIENT_ID, AuthenticationResponse.Type.TOKEN, REDIRECT_URI);

        builder.setScopes(new String[]{"streaming"});
        builder.setShowDialog(true);
        AuthenticationRequest request = builder.build();

        AuthenticationClient.openLoginInBrowser(this, request);
    }


    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);

        Uri uri = intent.getData();
        if (uri != null) {
            AuthenticationResponse response = AuthenticationResponse.fromUri(uri);

            switch (response.getType()) {
                // Response was successful and contains auth token
                case TOKEN:
                    logToken = response.getAccessToken();
                    // Handle successful response
                    Log.d("MainActivity", "Response was successful and contains auth token");
                    Log.d("MainActivity", logToken);

                    Intent NextPage = new Intent(this, SecondActivity.class);
                    NextPage.putExtra("token", logToken);
                    MainActivity.this.startActivity(NextPage);
                    break;

                // Auth flow returned an error
                case ERROR:
                    logError = response.getError();
                    Log.d("MainActivity", logError);
                    // Handle error response
                    break;

                // Most likely auth flow was cancelled
                default:
                    Log.d("MainActivity", "Auth flow cancelled");
                    // Handle other cases
            }
        }
    }


    @Override
    protected void onDestroy() {
        super.onDestroy();
    }
}
