import './globals.css';
import PWAInstaller from './components/PWAInstaller';

export const metadata = {
  title: 'Sabay Luk POS • ប្រព័ន្ធគ្រប់គ្រងការលក់ និងស្តុកទំនិញទំនើប',
  description: 'ប្រព័ន្ធគ្រប់គ្រងការលក់ POS ស្តុកទំនិញ Size/Color ចេញវិក្កយបត្រ Bakong KHQR និងហាងលក់ទំនិញអនឡាញ E-Commerce នៅកម្ពុជា',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: '#ff6a00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="km" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ff6a00" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <meta name="format-detection" content="telephone=no" />

                {/* 🛡️ ការពារកុំឱ្យ Browser Extension & QuotaExceededError បង្កជា Runtime Error រំខានដល់ App 🛡️ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                // 1. Define window.ethereum safely
                try {
                  var _eth = window.ethereum;
                  Object.defineProperty(window, 'ethereum', {
                    configurable: true,
                    enumerable: true,
                    get: function() { return _eth; },
                    set: function(val) { _eth = val; }
                  });
                } catch (_) {}

                // 2. Safe localStorage.setItem proxy to prevent QuotaExceededError crashes
                try {
                  if (window.localStorage && !window.localStorage.__safe_patched) {
                    var rawSetItem = window.localStorage.setItem.bind(window.localStorage);
                    window.localStorage.setItem = function(k, v) {
                      try {
                        rawSetItem(k, v);
                      } catch (err) {
                        var isQuota = err && (
                          err.name === 'QuotaExceededError' ||
                          err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                          err.code === 22 ||
                          err.code === 1014 ||
                          (err.message && err.message.indexOf('exceeded the quota') !== -1)
                        );
                        if (isQuota) {
                          console.warn('⚠️ localStorage quota exceeded when setting:', k);
                          try {
                            // Free up space by removing non-essential draft and cache keys
                            var keysToPrune = [
                              'sabay_draft_preview_product',
                              'sabay_product_draft',
                              'sabay_pos_customer_display_state',
                              'sabay_shift_history'
                            ];
                            for (var i = 0; i < keysToPrune.length; i++) {
                              window.localStorage.removeItem(keysToPrune[i]);
                            }
                            // Also prune keys with large temporary cache
                            for (var j = window.localStorage.length - 1; j >= 0; j--) {
                              var curKey = window.localStorage.key(j);
                              if (curKey && (curKey.indexOf('cache') !== -1 || curKey.indexOf('draft') !== -1 || curKey.indexOf('preview') !== -1)) {
                                window.localStorage.removeItem(curKey);
                              }
                            }
                            rawSetItem(k, v);
                          } catch (retryErr) {
                            console.warn('⚠️ Could not save after quota cleanup for key:', k);
                          }
                        } else {
                          console.warn('⚠️ localStorage setItem error:', err);
                        }
                      }
                    };
                    window.localStorage.__safe_patched = true;
                  }
                } catch (_) {}

                // 3. Intercept & suppress external extension errors and quota errors from triggering Next.js dev overlay
                var isIgnorableErr = function(msg, file, stack) {
                  var str = ((msg || '') + ' ' + (file || '') + ' ' + (stack || '')).toLowerCase();
                  return (
                    str.indexOf('ethereum') !== -1 ||
                    str.indexOf('cannot redefine property') !== -1 ||
                    str.indexOf('chrome-extension:') !== -1 ||
                    str.indexOf('moz-extension:') !== -1 ||
                    str.indexOf('window-provider.js') !== -1 ||
                    str.indexOf('evmproviders') !== -1 ||
                    str.indexOf('quotaexceedederror') !== -1 ||
                    str.indexOf('exceeded the quota') !== -1
                  );
                };

                window.addEventListener('error', function(e) {
                  if (isIgnorableErr(e.message, e.filename, e.error && e.error.stack)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return true;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  var r = e.reason || {};
                  if (isIgnorableErr(r.message, '', r.stack)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
              })();
            `,
          }}
        />
              {/* Script សម្រាប់ទាញយករូប Icon ស្វ័យប្រវត្តិពី Iconify API */}
        <script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script>
      </head>
      <body suppressHydrationWarning>
        {children}
        <PWAInstaller />
      </body>
    </html>
  );
}
