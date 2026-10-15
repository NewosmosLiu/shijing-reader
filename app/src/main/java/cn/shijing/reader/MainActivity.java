package cn.shijing.reader;

import android.app.Activity;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.widget.Toast;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.graphics.pdf.PdfRenderer;
import android.os.ParcelFileDescriptor;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.view.View;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

/** Offline reader: requests are served exclusively from bundled assets. */
public final class MainActivity extends Activity {
    private WebView web;
    private static final String HOST = "app.shijing.local";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(247,244,236));
        getWindow().setNavigationBarColor(Color.rgb(247,244,236));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundColor(Color.rgb(247,244,236));
        frame.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(247,244,236));
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.addJavascriptInterface(new ReaderBackup(),"ReaderNative");
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                if (!request.isForMainFrame()) return true;
                return openLink(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) {return openLink(Uri.parse(url));}
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest request) {
                if (!HOST.equals(request.getUrl().getHost())) return empty();
                String path = request.getUrl().getPath();
                if (path == null || path.contains("..")) return empty();
                if (path.matches("/pdf-page/[0-9]{1,3}\\.png")) {
                    int number = Integer.parseInt(path.substring(10,path.length()-4));
                    float scale = "4".equals(request.getUrl().getQueryParameter("scale")) ? 4f : 2.5f;
                    return renderPdfPage(number,scale);
                }
                if (path.equals("/")) path = "/index.html";
                String mime = path.endsWith(".html") ? "text/html" : path.endsWith(".css") ? "text/css" : path.endsWith(".js") ? "application/javascript" : path.endsWith(".json") ? "application/json" : path.endsWith(".png") ? "image/png" : "text/plain";
                try {return new WebResourceResponse(mime,"UTF-8",getAssets().open(path.substring(1)));}
                catch (Exception e) {return empty();}
            }
            private WebResourceResponse empty() {return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",null,new ByteArrayInputStream(new byte[0]));}
        });
        frame.addView(web,new FrameLayout.LayoutParams(-1,-1));
        setContentView(frame);
        frame.requestApplyInsets();
        web.loadUrl("https://"+HOST+"/index.html");
    }
    private boolean openLink(Uri uri) {
        if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost())) return false;
        String address = uri.toString();
        Intent intent = null;
        if ("https://github.com/NewosmosLiu/shijing-reader".equals(address)) intent = new Intent(Intent.ACTION_VIEW,uri);
        if ("mailto:newcosmosliu@outlook.com".equals(address)) intent = new Intent(Intent.ACTION_SENDTO,uri);
        if (intent != null) {
            try {startActivity(intent);}
            catch (ActivityNotFoundException e) {Toast.makeText(this,"没有找到可以打开此链接的应用",Toast.LENGTH_SHORT).show();}
        }
        return true;
    }
    /** Immutable snapshot of the exact legacy records before the first update read. */
    public final class ReaderBackup {
        @JavascriptInterface public synchronized boolean snapshotLegacy(String raw) {
            try {
                if (raw == null || raw.length() > 2 * 1024 * 1024) return false;
                org.json.JSONObject snapshot = new org.json.JSONObject();
                snapshot.put("format","shijing-reader-legacy-snapshot");
                snapshot.put("version",1);
                snapshot.put("createdAt",System.currentTimeMillis());
                snapshot.put("raw",raw);
                snapshot.put("data",new org.json.JSONObject(raw));
                byte[] bytes = snapshot.toString().getBytes("UTF-8");
                writeSnapshot(new File(getFilesDir(),"backups"),bytes);
                File external = getExternalFilesDir(null);
                if (external != null) writeSnapshot(new File(external,"backups"),bytes);
                return true;
            } catch (Exception e) {return false;}
        }
        private void writeSnapshot(File directory,byte[] bytes) throws java.io.IOException {
            if (!directory.exists() && !directory.mkdirs()) throw new java.io.IOException("Cannot create backup directory");
            File target = new File(directory,"before-v1.2.json");
            if (target.exists()) return;
            File staging = new File(directory,"before-v1.2.json.tmp");
            try (FileOutputStream output = new FileOutputStream(staging)) {
                output.write(bytes);output.getFD().sync();
            }
            if (!staging.renameTo(target)) throw new java.io.IOException("Cannot save backup snapshot");
        }
    }
    /** Render directly from the bundled original PDF; retain only a private cached PDF. */
    private synchronized WebResourceResponse renderPdfPage(int number,float scale) {
        try {
            File file = new File(getCacheDir(),"source-book-v1.pdf");
            if (!file.exists()) {
                File staging = new File(getCacheDir(),"source-book-v1.pdf.tmp");
                try (InputStream input = getAssets().open("source-book.pdf");FileOutputStream output = new FileOutputStream(staging)) {
                    byte[] buffer = new byte[32768];int length;
                    while ((length=input.read(buffer))!=-1) output.write(buffer,0,length);
                }
                if (!staging.renameTo(file)) throw new java.io.IOException("Cannot prepare source PDF");
            }
            try (ParcelFileDescriptor fd = ParcelFileDescriptor.open(file,ParcelFileDescriptor.MODE_READ_ONLY);PdfRenderer renderer = new PdfRenderer(fd)) {
                if (number<1 || number>renderer.getPageCount()) throw new IllegalArgumentException("Page outside source PDF");
                try (PdfRenderer.Page page = renderer.openPage(number-1)) {
                    Bitmap bitmap = Bitmap.createBitmap(Math.round(page.getWidth()*scale),Math.round(page.getHeight()*scale),Bitmap.Config.ARGB_8888);
                    try {
                        bitmap.eraseColor(Color.WHITE);
                        page.render(bitmap,null,null,PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                        bitmap.compress(Bitmap.CompressFormat.PNG,100,bytes);
                        return new WebResourceResponse("image/png",null,new ByteArrayInputStream(bytes.toByteArray()));
                    } finally {bitmap.recycle();}
                }
            }
        } catch (Exception e) {
            return new WebResourceResponse("text/plain","UTF-8",500,"PDF page unavailable",null,new ByteArrayInputStream(new byte[0]));
        }
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("window.handleAndroidBack ? window.handleAndroidBack() : false",value -> {
            if (!"true".equals(value)) {web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'))",null);finish();}
        });
    }
    @Override protected void onPause() {web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'))",null);web.onPause();super.onPause();}
    @Override protected void onResume() {super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy() {if(web!=null)web.destroy();super.onDestroy();}
}
