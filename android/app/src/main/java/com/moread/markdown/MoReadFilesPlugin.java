package com.moread.markdown;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.print.PrintManager;
import android.provider.OpenableColumns;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "MoReadFiles")
public class MoReadFilesPlugin extends Plugin {

    private static final long MAX_BYTES = 32L * 1024L * 1024L;
    private static MoReadFilesPlugin instance;
    private static Uri initialUri;

    private String pendingText;
    private String pendingBase64;

    @Override
    public void load() {
        instance = this;
    }

    public static void captureIntent(Intent intent) {
        Uri uri = intentUri(intent);
        if (uri != null) initialUri = uri;
    }

    public static void deliverIntent(Intent intent) {
        Uri uri = intentUri(intent);
        if (uri == null) return;
        Context context = instance != null ? instance.getContext() : null;
        if (context != null) {
            persistPermission(context, uri);
        }
        if (instance != null) instance.emitOpen(uri);
    }

    private static Uri intentUri(Intent intent) {
        if (intent == null) return null;
        String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action)) return intent.getData();
        if (Intent.ACTION_SEND.equals(action)) {
            try {
                return intent.getParcelableExtra(Intent.EXTRA_STREAM);
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    private static void persistPermission(Context context, Uri uri) {
        try {
            context.getContentResolver().takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            );
        } catch (Exception ignored) {
            try {
                context.getContentResolver().takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                );
            } catch (Exception ignoredAgain) {
                // The provider does not offer persistable access; reads still work while granted.
            }
        }
    }

    private void emitOpen(Uri uri) {
        JSObject payload = new JSObject();
        payload.put("uri", uri.toString());
        payload.put("name", displayName(uri));
        payload.put("mime", mimeType(uri));
        notifyListeners("documentOpen", payload);
    }

    @PluginMethod
    public void initial(PluginCall call) {
        JSObject result = new JSObject();
        if (initialUri != null) {
            result.put("uri", initialUri.toString());
            result.put("name", displayName(initialUri));
            result.put("mime", mimeType(initialUri));
        }
        call.resolve(result);
    }

    @PluginMethod
    public void pick(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mime", "*/*"));
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, call.getBoolean("multiple", false));
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        try {
            startActivityForResult(call, intent, "pickResult");
        } catch (ActivityNotFoundException error) {
            Intent fallback = new Intent(Intent.ACTION_GET_CONTENT);
            fallback.addCategory(Intent.CATEGORY_OPENABLE);
            fallback.setType(call.getString("mime", "*/*"));
            fallback.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, call.getBoolean("multiple", false));
            fallback.addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            );
            try {
                startActivityForResult(call, fallback, "pickResult");
            } catch (ActivityNotFoundException again) {
                call.reject("PICKER_UNAVAILABLE");
            }
        }
    }

    @ActivityCallback
    private void pickResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("USER_CANCELED");
            return;
        }
        Intent data = result.getData();
        List<Uri> uris = new ArrayList<>();
        ClipData clip = data.getClipData();
        if (clip != null) {
            for (int i = 0; i < clip.getItemCount(); i += 1) {
                Uri uri = clip.getItemAt(i).getUri();
                if (uri != null) uris.add(uri);
            }
        } else if (data.getData() != null) {
            uris.add(data.getData());
        }
        if (uris.isEmpty()) {
            call.reject("USER_CANCELED");
            return;
        }
        org.json.JSONArray files = new org.json.JSONArray();
        for (Uri uri : uris) {
            persistPermission(getContext(), uri);
            org.json.JSONObject item = new org.json.JSONObject();
            try {
                item.put("uri", uri.toString());
                item.put("name", displayName(uri));
                item.put("mime", mimeType(uri));
            } catch (Exception error) {
                continue;
            }
            files.put(item);
        }
        JSObject ret = new JSObject();
        ret.put("files", files);
        call.resolve(ret);
    }

    @PluginMethod
    public void create(PluginCall call) {
        pendingText = call.getString("text", null);
        pendingBase64 = call.getString("base64", null);
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(call.getString("mime", "text/markdown"));
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        String name = call.getString("name", "未命名.md");
        intent.putExtra(Intent.EXTRA_TITLE, name);
        try {
            startActivityForResult(call, intent, "createResult");
        } catch (ActivityNotFoundException error) {
            pendingText = null;
            pendingBase64 = null;
            call.reject("NO_SAVER");
        }
    }

    @ActivityCallback
    private void createResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            pendingText = null;
            pendingBase64 = null;
            call.reject("USER_CANCELED");
            return;
        }
        Uri uri = result.getData().getData();
        if (uri == null) {
            call.reject("USER_CANCELED");
            return;
        }
        persistPermission(getContext(), uri);
        try {
            if (pendingText != null) {
                writeBytes(uri, pendingText.getBytes(StandardCharsets.UTF_8));
            } else if (pendingBase64 != null) {
                writeBytes(uri, Base64.decode(pendingBase64, Base64.DEFAULT));
            }
        } catch (Exception error) {
            call.reject("写入失败：" + error.getMessage());
            return;
        } finally {
            pendingText = null;
            pendingBase64 = null;
        }
        JSObject ret = new JSObject();
        ret.put("uri", uri.toString());
        ret.put("name", displayName(uri));
        call.resolve(ret);
    }

    @PluginMethod
    public void read(PluginCall call) {
        String uriString = call.getString("uri", "");
        boolean binary = call.getBoolean("binary", false);
        if (uriString.isEmpty()) {
            call.reject("缺少文件地址");
            return;
        }
        Uri uri = Uri.parse(uriString);
        try {
            byte[] bytes = readBytes(uri, MAX_BYTES);
            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            ret.put("name", displayName(uri));
            ret.put("mime", mimeType(uri));
            ret.put("size", bytes.length);
            if (binary) {
                ret.put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP));
            } else {
                ret.put("text", new String(bytes, StandardCharsets.UTF_8));
            }
            call.resolve(ret);
        } catch (Exception error) {
            call.reject("读取失败：" + error.getMessage());
        }
    }

    @PluginMethod
    public void write(PluginCall call) {
        String uriString = call.getString("uri", "");
        if (uriString.isEmpty()) {
            call.reject("缺少文件地址");
            return;
        }
        Uri uri = Uri.parse(uriString);
        try {
            String text = call.getString("text", null);
            String base64 = call.getString("base64", null);
            if (text != null) {
                writeBytes(uri, text.getBytes(StandardCharsets.UTF_8));
            } else if (base64 != null) {
                writeBytes(uri, Base64.decode(base64, Base64.DEFAULT));
            } else {
                call.reject("没有要写入的内容");
                return;
            }
            JSObject ret = new JSObject();
            ret.put("uri", uri.toString());
            ret.put("name", displayName(uri));
            ret.put("size", text != null ? text.length() : 0);
            call.resolve(ret);
        } catch (Exception error) {
            String message = error.getMessage() == null ? "" : error.getMessage();
            if (message.contains("WRITE_DENIED") || message.contains("Permission")) {
                call.reject("WRITE_DENIED: " + message);
            } else {
                call.reject("写入失败：" + message);
            }
        }
    }

    /**
     * 写入无需授权的应用私有目录，并在系统分享面板里让用户保存/发送。
     * 用于系统「另存为」不可用（部分 HarmonyOS 兼容层）时的兜底。
     */
    @PluginMethod
    public void shareSaved(PluginCall call) {
        String name = call.getString("name", "未命名.md");
        String text = call.getString("text", null);
        String base64 = call.getString("base64", null);
        String mime = call.getString("mime", "text/markdown");
        try {
            File file = resolveAppFile("saved/" + sanitizeFileName(name));
            File parent = file.getParentFile();
            if (parent != null && !parent.exists()) parent.mkdirs();
            if (text != null) {
                writeFileBytes(file, text.getBytes(StandardCharsets.UTF_8));
            } else if (base64 != null) {
                writeFileBytes(file, Base64.decode(base64, Base64.DEFAULT));
            } else {
                call.reject("没有要写入的内容");
                return;
            }

            Uri contentUri = androidx.core.content.FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );
            Intent share = new Intent(Intent.ACTION_SEND);
            share.setType(mime);
            share.putExtra(Intent.EXTRA_STREAM, contentUri);
            share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent chooser = Intent.createChooser(share, "保存或分享");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);

            JSObject ret = new JSObject();
            ret.put("uri", Uri.fromFile(file).toString());
            ret.put("path", file.getAbsolutePath());
            ret.put("name", file.getName());
            call.resolve(ret);
        } catch (Exception error) {
            call.reject("保存失败：" + error.getMessage());
        }
    }

    private static String sanitizeFileName(String value) {
        String name = value == null || value.isEmpty() ? "未命名.md" : value;
        name = name.replaceAll("[\\\\/:*?\"<>|]", "-");
        return name.length() > 120 ? name.substring(name.length() - 120) : name;
    }

    @PluginMethod
    public void writeAppFile(PluginCall call) {
        String path = call.getString("path", "");
        try {
            File file = resolveAppFile(path);
            File parent = file.getParentFile();
            if (parent != null && !parent.exists()) parent.mkdirs();
            String text = call.getString("text", null);
            String base64 = call.getString("base64", null);
            if (text != null) {
                writeFileBytes(file, text.getBytes(StandardCharsets.UTF_8));
            } else if (base64 != null) {
                writeFileBytes(file, Base64.decode(base64, Base64.DEFAULT));
            } else {
                call.reject("没有要写入的内容");
                return;
            }
            JSObject ret = new JSObject();
            ret.put("uri", Uri.fromFile(file).toString());
            ret.put("path", file.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception error) {
            call.reject("写入应用文件失败：" + error.getMessage());
        }
    }

    @PluginMethod
    public void removeAppDir(PluginCall call) {
        try {
            File dir = resolveAppFile(call.getString("path", ""));
            deleteRecursively(dir);
            JSObject ret = new JSObject();
            ret.put("removed", dir.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception error) {
            call.reject("删除目录失败：" + error.getMessage());
        }
    }

    private static void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        File[] children = file.listFiles();
        if (children != null) {
            for (File child : children) deleteRecursively(child);
        }
        //noinspection ResultOfMethodCallIgnored
        file.delete();
    }

    @PluginMethod
    public void appFileUri(PluginCall call) {
        try {
            File file = resolveAppFile(call.getString("path", ""));
            JSObject ret = new JSObject();
            ret.put("uri", Uri.fromFile(file).toString());
            ret.put("path", file.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception error) {
            call.reject("解析路径失败：" + error.getMessage());
        }
    }

    @PluginMethod
    public void openUrl(PluginCall call) {
        String url = call.getString("url", "");
        if (url.isEmpty()) {
            call.reject("缺少链接");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("无法打开链接：" + error.getMessage());
        }
    }

    /**
     * 检查更新用的只读 GET。WebView 受 CSP `connect-src 'self'` 限制不能直连外网，
     * 所以把请求放到原生侧；只允许 https，且限制响应体积，避免被远端拖垮。
     */
    @PluginMethod
    public void httpGet(PluginCall call) {
        String url = call.getString("url", "");
        if (url.isEmpty()) {
            call.reject("缺少链接");
            return;
        }
        if (!url.startsWith("https://")) {
            call.reject("只允许 https 链接");
            return;
        }
        Integer requested = call.getInt("timeoutMs", 8000);
        final int timeoutMs = Math.max(1000, requested == null ? 8000 : requested);
        final String target = url;
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(target).openConnection();
                connection.setConnectTimeout(timeoutMs);
                connection.setReadTimeout(timeoutMs);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("Accept", "application/vnd.github+json");
                connection.setRequestProperty("User-Agent", "MoRead-UpdateCheck");
                int status = connection.getResponseCode();
                InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                if (stream != null) {
                    byte[] chunk = new byte[8192];
                    int read;
                    long total = 0L;
                    while ((read = stream.read(chunk)) != -1) {
                        total += read;
                        if (total > MAX_BYTES) throw new IOException("响应超过上限");
                        buffer.write(chunk, 0, read);
                    }
                    stream.close();
                }
                JSObject ret = new JSObject();
                ret.put("status", status);
                ret.put("body", buffer.toString(StandardCharsets.UTF_8.name()));
                call.resolve(ret);
            } catch (Exception error) {
                String message = error.getMessage() == null ? error.toString() : error.getMessage();
                call.reject("请求失败：" + message);
            } finally {
                if (connection != null) connection.disconnect();
            }
        }, "moread-update-check").start();
    }

    @PluginMethod
    public void setSystemBars(PluginCall call) {
        String statusColor = call.getString("statusColor", "#f2ede4");
        String navColor = call.getString("navColor", statusColor);
        boolean dark = call.getBoolean("dark", false);
        Activity activity = getActivity();
        activity.runOnUiThread(() -> {
            try {
                android.view.Window window = activity.getWindow();
                window.setStatusBarColor(android.graphics.Color.parseColor(statusColor));
                window.setNavigationBarColor(android.graphics.Color.parseColor(navColor));
                android.view.View decor = window.getDecorView();
                int flags = decor.getSystemUiVisibility();
                if (dark) {
                    flags &= ~android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    flags &= ~android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                } else {
                    flags |= android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    flags |= android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                }
                decor.setSystemUiVisibility(flags);
                call.resolve();
            } catch (Exception error) {
                call.reject("设置系统栏失败：" + error.getMessage());
            }
        });
    }

    @PluginMethod
    public void print(PluginCall call) {
        try {
            Activity activity = getActivity();
            String jobName = call.getString("jobName", "MoRead");
            activity.runOnUiThread(() -> {
                PrintManager manager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
                if (manager == null || getBridge().getWebView() == null) {
                    call.reject("系统打印不可用");
                    return;
                }
                manager.print(jobName, getBridge().getWebView().createPrintDocumentAdapter(jobName), null);
                call.resolve();
            });
        } catch (Exception error) {
            call.reject("打印失败：" + error.getMessage());
        }
    }

    private File resolveAppFile(String path) throws IOException {
        String relative = path == null ? "" : path.replace('\\', '/');
        while (relative.startsWith("/")) relative = relative.substring(1);
        File base = getContext().getFilesDir();
        File target = new File(base, relative);
        String basePath = base.getCanonicalPath();
        String targetPath = target.getCanonicalPath();
        if (!targetPath.startsWith(basePath + File.separator) && !targetPath.equals(basePath)) {
            throw new IOException("路径越界");
        }
        return target;
    }

    private void writeFileBytes(File file, byte[] bytes) throws IOException {
        try (OutputStream output = new FileOutputStream(file)) {
            output.write(bytes);
        }
    }

    private byte[] readBytes(Uri uri, long limit) throws IOException {
        InputStream input = openInput(uri);
        try (InputStream stream = input; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16 * 1024];
            long total = 0;
            int read;
            while ((read = stream.read(buffer)) != -1) {
                total += read;
                if (total > limit) throw new IOException("文件过大");
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        }
    }

    private void writeBytes(Uri uri, byte[] bytes) throws IOException {
        try (OutputStream output = openOutput(uri)) {
            output.write(bytes);
        }
    }

    private InputStream openInput(Uri uri) throws IOException {
        if ("file".equalsIgnoreCase(uri.getScheme())) {
            return new FileInputStream(new File(uri.getPath()));
        }
        InputStream stream = getContext().getContentResolver().openInputStream(uri);
        if (stream == null) throw new IOException("无法读取该文件");
        return stream;
    }

    private OutputStream openOutput(Uri uri) throws IOException {
        if ("file".equalsIgnoreCase(uri.getScheme())) {
            File file = new File(uri.getPath());
            File parent = file.getParentFile();
            if (parent != null && !parent.exists()) parent.mkdirs();
            return new FileOutputStream(file);
        }
        ContentResolver resolver = getContext().getContentResolver();
        IOException lastError = null;
        for (String mode : new String[] { "wt", "w", "rwt" }) {
            try {
                OutputStream stream = resolver.openOutputStream(uri, mode);
                if (stream != null) return stream;
            } catch (SecurityException error) {
                throw new IOException("WRITE_DENIED: " + error.getMessage(), error);
            } catch (IOException error) {
                lastError = error;
            } catch (IllegalArgumentException error) {
                lastError = new IOException(error.getMessage(), error);
            }
        }
        if (lastError != null) throw lastError;
        throw new IOException("WRITE_UNAVAILABLE");
    }

    private String displayName(Uri uri) {
        if ("file".equalsIgnoreCase(uri.getScheme())) {
            String path = uri.getPath();
            return path == null ? "未命名.md" : new File(path).getName();
        }
        try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    String name = cursor.getString(index);
                    if (name != null && !name.isEmpty()) return name;
                }
            }
        } catch (Exception ignored) {
            // Fall back to the last path segment.
        }
        String segment = uri.getLastPathSegment();
        return segment == null ? "未命名.md" : segment;
    }

    private String mimeType(Uri uri) {
        if ("file".equalsIgnoreCase(uri.getScheme())) {
            String name = displayName(uri).toLowerCase();
            if (name.endsWith(".md") || name.endsWith(".markdown")) return "text/markdown";
            if (name.endsWith(".css")) return "text/css";
            if (name.endsWith(".json")) return "application/json";
            if (name.endsWith(".zip")) return "application/zip";
            if (name.endsWith(".png")) return "image/png";
            if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
            if (name.endsWith(".webp")) return "image/webp";
            return "text/plain";
        }
        String type = getContext().getContentResolver().getType(uri);
        return type == null ? "application/octet-stream" : type;
    }
}
