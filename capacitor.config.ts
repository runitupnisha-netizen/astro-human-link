import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.runitupmedia.stellara',
  appName: 'Stellara',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    scrollEnabled: true,
    webContentsDebuggingEnabled: false,
    limitsNavigationsToAppBoundDomains: false,
    // Note: Capacitor iOS has no public `zoomEnabled` option — the previous
    // flag was a no-op. Enabling WKWebView pinch-zoom requires a native
    // override (subclassing the WebView delegate in AppDelegate.swift), which
    // we're deferring. The in-app Text Size control in Settings is the
    // supported escape hatch for legibility.
  },
};

export default config;
