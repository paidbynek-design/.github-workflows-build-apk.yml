package com.ducky.app

import android.content.Intent
import android.content.pm.PackageManager
import android.util.Base64
import android.webkit.JavascriptInterface
import org.json.JSONObject
import rikka.shizuku.Shizuku
import rikka.shizuku.ShizukuRemoteProcess
import java.io.File

class ShizukuBridge(private val context: android.content.Context) {

    companion object {
        private const val PERMISSION_REQUEST_CODE = 4209
        private const val ABI = "arm64-v8a"
    }

    @JavascriptInterface
    fun shizukuStatus(): String {
        return try {
            if (!Shizuku.pingBinder()) {
                "not_running"
            } else if (Shizuku.isPreV11() || Shizuku.shouldShowRequestPermissionRationale()) {
                "permission_required"
            } else if (Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED) {
                "available"
            } else {
                "permission_required"
            }
        } catch (e: Throwable) {
            "unsupported"
        }
    }

    @JavascriptInterface
    fun requestPermission(): Boolean {
        return try {
            if (Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED) {
                true
            } else {
                Shizuku.requestPermission(PERMISSION_REQUEST_CODE)
                Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED
            }
        } catch (e: Throwable) {
            false
        }
    }

    @JavascriptInterface
    fun applyLib(targetPackage: String, fileName: String, dataBase64: String): String {
        return try {
            val bytes = Base64.decode(dataBase64, Base64.DEFAULT)
            val staged = File(context.cacheDir, fileName)
            staged.writeBytes(bytes)

            val appInfo = context.packageManager.getApplicationInfo(targetPackage, 0)
            val nativeDir = appInfo.nativeLibraryDir
            val dataLibDir = "/data/data/$targetPackage/lib/$ABI"

            val targets = listOf(nativeDir, dataLibDir)
            val sb = StringBuilder()
            for (dir in targets) {
                sb.append("mkdir -p '$dir'; ")
                sb.append("cp -f '${staged.absolutePath}' '$dir/$fileName'; ")
                sb.append("chmod 755 '$dir/$fileName'; ")
                sb.append("chown $targetPackage:$targetPackage '$dir/$fileName' 2>/dev/null; ")
                sb.append("restorecon '$dir/$fileName' 2>/dev/null; ")
            }
            val cmd = arrayOf("sh", "-c", sb.toString())

            val process: ShizukuRemoteProcess = Shizuku.newProcess(cmd, null, null)
            val exit = process.waitFor()
            val stderr = process.errorStream.bufferedReader().readText()

            val result = JSONObject()
            if (exit == 0) {
                result.put("ok", true)
                result.put("message", "Applied $fileName to $targetPackage ($ABI).")
            } else {
                result.put("ok", false)
                result.put("message", "Shell exited $exit: ${stderr.take(200)}")
            }
            result.toString()
        } catch (e: PackageManager.NameNotFoundException) {
            JSONObject().put("ok", false).put("message", "Game package not installed.").toString()
        } catch (e: Throwable) {
            JSONObject().put("ok", false).put("message", "Apply failed: ${e.message}").toString()
        }
    }

    /**
     * Launches the given package as if the user tapped its icon.
     * Returns JSON { ok, message }.
     */
    @JavascriptInterface
    fun launchPackage(packageName: String): String {
        return try {
            val intent = context.packageManager.getLaunchIntentForPackage(packageName)
                ?: return JSONObject()
                    .put("ok", false)
                    .put("message", "Could not find launch intent for $packageName — is the game installed?")
                    .toString()
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            context.startActivity(intent)
            JSONObject().put("ok", true).put("message", "Launched $packageName").toString()
        } catch (e: Throwable) {
            JSONObject().put("ok", false).put("message", "Launch failed: ${e.message}").toString()
        }
    }
}
