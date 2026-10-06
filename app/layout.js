import { Bricolage_Grotesque, Martian_Mono } from "next/font/google";
import "./globals.css";
import { SERVER_LANG } from "@/lib/i18n";

// Grotesca con carácter para títulos y texto (con ejes de ancho y tamaño óptico),
// y una monoespaciada para datos, etiquetas y cifras.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth", "opsz"],
  variable: "--font-bricolage",
});
const martian = Martian_Mono({
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
  variable: "--font-martian",
});

export const metadata = {
  title: "BrandBridge — Market Expansion Intelligence",
  description: "Discover international brands to bring to Latin America, with an opportunity score per country, honest AI analysis and a live chat.",
};

export const viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='#FBE8A6'/><stop offset='.55' stop-color='#D9BC7C'/><stop offset='1' stop-color='#B8954A'/></linearGradient></defs><rect width='32' height='32' rx='8' fill='#1C1C1C'/><rect x='6' y='17' width='6' height='9' rx='1.5' fill='url(#g)'/><rect x='13' y='12' width='6' height='14' rx='1.5' fill='url(#g)'/><rect x='20' y='7' width='6' height='19' rx='1.5' fill='url(#g)'/></svg>"
  );

export default function RootLayout({ children }) {
  return (
    <html lang={SERVER_LANG} className={`${bricolage.variable} ${martian.variable}`}>
      <head>
        <link rel="icon" href={FAVICON} />
      </head>
      <body>{children}</body>
    </html>
  );
}
