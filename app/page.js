import { BRANDS, COUNTRIES } from "@/lib/data";
import { SERVER_LANG } from "@/lib/i18n";
import BrandBridge from "@/components/BrandBridge";

// El idioma (APP_LANG) se lee al publicar la app: si se cambia en Vercel, hay que hacer Redeploy.
export default function Home() {
  return <BrandBridge brands={BRANDS} countries={COUNTRIES} lang={SERVER_LANG} />;
}
