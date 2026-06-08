package com.ducky.app

import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import android.webkit.JavascriptInterface
import org.json.JSONObject
import rikka.shizuku.Shizuku
import rikka.shizuku.ShizukuRemoteProcess
import java.io.File

/**
 * Native bridge that the web UI (lib/libfile.ts) talks to via window.ShizukuBridge.
 *
 * The web layer only knows about three methods:
 *   - shizukuStatus()  -> "available" | "permission_required" | "not_running" | "unsupported"
 *   - requestPermission() -> boolean (granted)
 *   - applyLib(targetPackage, fileName, dataBase64) -> JSON string { ok, message }
 *
 * Everything privileged (writing into another app's arm64-v8a lib dir) happens here,
 * through a Shizuku elevated shell. A WebView/JS layer can never do this on its own.
 */
class ShizukuBridge(private val context: android.content.Context) {

    companion object {
        private const val PERMISSION_REQUEST_CODE = 4209
        // arm64-v8a is the 64-bit ARM ABI folder we target.
        private const val ABI = "arm64-v8a"
    }

    // ---- status -------------------------------------------------------------

    @JavascriptInterface
    fun shizukuStatus(): String {
        return try {
            if (!Shizuku.pingBinder()) {
                // Shizuku service is not running / app not started.
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

    // ---- permission ---------------------------------------------------------

    @JavascriptInterface
    fun requestPermission(): Boolean {
        return try {
            if (Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED) {
                true
            } else {
                // This pops the Shizuku permission dialog. The result is delivered
                // asynchronously to a listener registered in MainActivity; for a
                // simple flow we return the current state and let the UI re-check.
                Shizuku.requestPermission(PERMISSION_REQUEST_CODE)
                Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED
            }
        } catch (e: Throwable) {
            false
        }
    }

    // ---- apply lib ----------------------------------------------------------

    @JavascriptInterface
    fun applyLib(targetPackage: String, fileName: String, dataBase64: String): String {
        return try {
            // 1. Decode the .so the web UI stored as base64 and stage it in our cache.
            val bytes = Base64.decode(dataBase64, Base64.DEFAULT)
            val staged = File(context.cacheDir, fileName)
            staged.writeBytes(bytes)

            // 2. Resolve the game's native library directory for arm64-v8a.
            //    Most games keep extracted libs at:
            //      /data/app/<...>/<package>/lib/arm64-v8a/
            //    We resolve nativeLibraryDir from the installed package, then
            //    fall back to the data/data lib path.
            val appInfo = context.packageManager.getApplicationInfo(targetPackage, 0)
            val nativeDir = appInfo.nativeLibraryDir // e.g. .../lib/arm64
            val dataLibDir = "/data/data/$targetPackage/lib/$ABI"

            // 3. Build a privileged shell command run through Shizuku.
            //    We copy into both the resolved native dir and the data lib dir,
            //    fixing ownership/permissions so the game can load it.
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
}
