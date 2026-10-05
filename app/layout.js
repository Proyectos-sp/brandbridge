import "./globals.css";
import { SERVER_LANG } from "@/lib/i18n";

export const metadata = {
  title: "BrandBridge — Market Expansion Intelligence",
  description: "Discover international brands to bring to Latin America, with honest AI analysis and a live chat.",
};

export const viewport = {
  themeColor: "#060609",
};

export default function RootLayout({ children }) {
  return (
    <html lang={SERVER_LANG}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap"
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌐</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
