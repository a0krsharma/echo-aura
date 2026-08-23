package com.echo.app;

import android.os.Bundle;
import android.os.Message;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();

            // 1. Clean Chrome User Agent to bypass Google's 403 disallowed_useragent block
            String defaultUserAgent = settings.getUserAgentString();
            String rawCleanUserAgent = defaultUserAgent.replace("; wv", "").replaceAll("Version/\\d+\\.\\d+", "");
            if (!rawCleanUserAgent.contains("Chrome/")) {
                rawCleanUserAgent = "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";
            }
            final String cleanUserAgent = rawCleanUserAgent;
            settings.setUserAgentString(cleanUserAgent);

            // 2. Enable Cookies & Third Party Cookies for Google Auth Session
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            // 3. Web & Multi-Window Settings for Google Account Picker
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setJavaScriptEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            // 4. Custom WebChromeClient to smoothly handle Google OAuth popup windows inside WebView
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    WebView popupWebView = new WebView(MainActivity.this);
                    WebSettings popupSettings = popupWebView.getSettings();
                    popupSettings.setJavaScriptEnabled(true);
                    popupSettings.setDomStorageEnabled(true);
                    popupSettings.setUserAgentString(cleanUserAgent);
                    
                    CookieManager.getInstance().setAcceptThirdPartyCookies(popupWebView, true);

                    popupWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public boolean shouldOverrideUrlLoading(WebView pView, String url) {
                            if (url != null && (url.contains("echo-aura.vercel.app") || url.contains("echo-aura.firebaseapp.com"))) {
                                webView.loadUrl(url);
                                return true;
                            }
                            return false;
                        }
                    });

                    WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                    transport.setWebView(popupWebView);
                    resultMsg.sendToTarget();
                    return true;
                }
            });
        }
    }
}
