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
