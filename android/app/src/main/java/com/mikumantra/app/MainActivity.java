package com.mikumantra.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.WebViewListener;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MikuGoogleAuth";
    private static final String WEB_CLIENT_ID = "998849094985-1ec0iv6a0ih2ulrru88vv3ngvcbcv68c.apps.googleusercontent.com";

    private GoogleSignInClient googleSignInClient;
    private ActivityResultLauncher<Intent> googleSignInLauncher;

    public class AndroidNativeGoogleAuthBridge {
        @JavascriptInterface
        public void signIn() {
            runOnUiThread(() -> startNativeGoogleSignIn());
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure native Google Sign-In with Web Client ID
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(WEB_CLIENT_ID)
                .requestEmail()
                .requestProfile()
                .build();

        googleSignInClient = GoogleSignIn.getClient(this, gso);

        // Register Activity Result for Google Sign-In
        googleSignInLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    Intent data = result.getData();
                    Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
                    handleSignInResult(task);
                }
        );

        // Setup WebView bridge and listeners
        setupWebViewBridge();
    }

    private void setupWebViewBridge() {
        if (bridge == null) return;

        WebView webView = bridge.getWebView();
        if (webView != null) {
            // Add JavaScript interface accessible to website scripts
            webView.addJavascriptInterface(new AndroidNativeGoogleAuthBridge(), "AndroidNativeGoogleAuth");

            // Intercept URL loading to prevent Chrome from opening blank accounts.google.com
            webView.setWebViewClient(new BridgeWebViewClient(bridge) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri url = request.getUrl();
                    String urlStr = url != null ? url.toString() : "";
                    if (urlStr.contains("accounts.google.com")) {
                        Log.i(TAG, "Intercepted accounts.google.com navigation, launching native Google Sign-In");
                        runOnUiThread(() -> startNativeGoogleSignIn());
                        return true; // Cancel navigation to external Chrome browser
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }
            });
        }

        // Add page loaded listener to inject Google button click interceptor
        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView loadedView) {
                injectGoogleButtonInterceptor(loadedView);
            }
        });
    }

    private void injectGoogleButtonInterceptor(WebView view) {
        if (view == null) return;

        String injectionScript =
                "(function() {" +
                "  if (window.__mikuGoogleNativeHooked) return;" +
                "  window.__mikuGoogleNativeHooked = true;" +
                "  document.addEventListener('click', function(e) {" +
                "    var el = e.target.closest('button, a, div[role=\"button\"]');" +
                "    if (!el) return;" +
                "    var txt = (el.innerText || el.textContent || '').trim().toLowerCase();" +
                "    if (txt.includes('google') || (el.className && typeof el.className === 'string' && el.className.toLowerCase().includes('google'))) {" +
                "      e.preventDefault();" +
                "      e.stopPropagation();" +
                "      if (window.AndroidNativeGoogleAuth) {" +
                "        window.AndroidNativeGoogleAuth.signIn();" +
                "      }" +
                "    }" +
                "  }, true);" +
                "})();";

        view.evaluateJavascript(injectionScript, null);
    }

    public void startNativeGoogleSignIn() {
        try {
            googleSignInClient.signOut().addOnCompleteListener(this, task -> {
                Intent signInIntent = googleSignInClient.getSignInIntent();
                googleSignInLauncher.launch(signInIntent);
            });
        } catch (Exception ex) {
            Log.e(TAG, "Error initiating Google sign-in", ex);
            Toast.makeText(this, "Could not start Google sign-in: " + ex.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void handleSignInResult(Task<GoogleSignInAccount> completedTask) {
        try {
            GoogleSignInAccount account = completedTask.getResult(ApiException.class);
            String idToken = account.getIdToken();
            if (idToken != null && !idToken.isEmpty()) {
                sendTokenToWebView(idToken);
            } else {
                Toast.makeText(this, "Google Sign-In succeeded but token was empty. Please check Google Cloud settings.", Toast.LENGTH_LONG).show();
            }
        } catch (ApiException e) {
            int code = e.getStatusCode();
            Log.w(TAG, "signInResult:failed code=" + code);
            if (code == 12501) {
                // User cancelled the dialog - no error needed
                Log.i(TAG, "User cancelled Google Sign-In");
            } else if (code == 10) {
                // Developer error: SHA-1 fingerprint or Package Name mismatch
                Toast.makeText(this, "Google Developer Error 10: Please verify SHA-1 fingerprint in Google Cloud Console.", Toast.LENGTH_LONG).show();
            } else {
                Toast.makeText(this, "Google Sign-In failed (code " + code + ")", Toast.LENGTH_LONG).show();
            }
        }
    }

    private void sendTokenToWebView(String idToken) {
        String safeToken = idToken.replace("'", "\\'");
        String loginJs =
                "(function() {" +
                "  fetch('/api/auth/google', {" +
                "    method: 'POST'," +
                "    headers: { 'Content-Type': 'application/json' }," +
                "    credentials: 'include'," +
                "    body: JSON.stringify({ credential: '" + safeToken + "' })" +
                "  })" +
                "  .then(function(res) {" +
                "    return res.json().then(function(data) {" +
                "      if (!res.ok) throw new Error(data.error || 'Google login failed');" +
                "      return data;" +
                "    });" +
                "  })" +
                "  .then(function(d) {" +
                "    if (d.token) {" +
                "      sessionStorage.setItem('mikumantra_tab_token', d.token);" +
                "      localStorage.setItem('mikumantra_tab_token', d.token);" +
                "    }" +
                "    if (d.user) {" +
                "      sessionStorage.setItem('mikumantra_user_cache', JSON.stringify(d.user));" +
                "      localStorage.setItem('mikumantra_user_cache', JSON.stringify(d.user));" +
                "      window.dispatchEvent(new CustomEvent('mikumantra:auth-change', { detail: d.user }));" +
                "    }" +
                "    window.location.href = '/account';" +
                "  })" +
                "  .catch(function(err) {" +
                "    alert('Google login failed: ' + (err.message || err));" +
                "  });" +
                "})();";

        runOnUiThread(() -> {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().evaluateJavascript(loginJs, null);
            }
        });
    }
}
