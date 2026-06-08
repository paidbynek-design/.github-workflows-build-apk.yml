package com.ducky.app

import android.os.Bundle
import android.webkit.WebView
import com.getcapacitor.BridgeActivity
import rikka.shizuku.Shizuku

/**
 * Capacitor entry activity. After Capacitor builds its WebView, we attach the
 * ShizukuBridge as a JavaScript interface named exactly "ShizukuBridge" so that
 * lib/libfile.ts can find it at window.ShizukuBridge.
 */
class MainActivity : BridgeActivity() {

    private val permissionListener =
        Shizuku.OnRequestPermissionResultListener { _, _ -> /* UI re-checks status */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        Shizuku.addRequestPermissionResultListener(permissionListener)

        // bridge.webView is provided by Capacitor's BridgeActivity.
        val webView: WebView = this.bridge.webView
        webView.settings.javaScriptEnabled = true
        webView.addJavascriptInterface(ShizukuBridge(applicationContext), "ShizukuBridge")
    }

    override fun onDestroy() {
        Shizuku.removeRequestPermissionResultListener(permissionListener)
        super.onDestroy()
    }
}
