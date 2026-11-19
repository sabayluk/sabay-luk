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
};

export default function RootLayout({ children }) {
  return (
    <html lang="km" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ff6a00" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/favicon.png" />

                {/* 🛡️ ការពារកុំឱ្យ Browser Extension (Crypto Wallet, Web3 window.ethereum) បង្កជា Runtime Error រំខានដល់ App 🛡️ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                try {
                  var _eth = window.ethereum;
                  Object.defineProperty(window, 'ethereum', {
                    configurable: true,
                    enumerable: true,
                    get: function() { return _eth; },
                    set: function(val) { _eth = val; }
                  });
                } catch (_) {}

                var isExtensionErr = function(msg, file, stack) {
                  var str = ((msg || '') + ' ' + (file || '') + ' ' + (stack || '')).toLowerCase();
                  return (
                    str.indexOf('ethereum') !== -1 ||
                    str.indexOf('cannot redefine property') !== -1 ||
                    str.indexOf('chrome-extension:') !== -1 ||
                    str.indexOf('moz-extension:') !== -1 ||
                    str.indexOf('window-provider.js') !== -1 ||
                    str.indexOf('evmproviders') !== -1
                  );
                };

                window.addEventListener('error', function(e) {
                  if (isExtensionErr(e.message, e.filename, e.error && e.error.stack)) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    return true;
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(e) {
                  var r = e.reason || {};
                  if (isExtensionErr(r.message, '', r.stack)) {
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
