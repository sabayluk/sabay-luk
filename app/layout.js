import './globals.css';

export const metadata = {
  title: 'Sabay Luk',
  description: 'Shop for shoes, watches, belts, and bags',
};

export default function RootLayout({ children }) {
  return (
    <html lang="km" suppressHydrationWarning>
      <head>
        {/* Script សម្រាប់ទាញយករូប Icon ស្វ័យប្រវត្តិពី Iconify API */}
        <script src="https://code.iconify.design/3/3.1.0/iconify.min.js"></script>
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}