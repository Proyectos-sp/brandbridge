import "./globals.css";

export const metadata = {
  title: "BrandBridge",
  description: "Descubre marcas internacionales para llevar a Latinoamérica, con análisis de IA.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
