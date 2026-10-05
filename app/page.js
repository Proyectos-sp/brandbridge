import { BRANDS, COUNTRIES } from "@/lib/data";
import Explorer from "@/components/Explorer";

export default function Home() {
  return (
    <main>
      <h1>BrandBridge</h1>
      <p className="muted">Descubre marcas para llevar a tu país, con análisis de IA y chat en vivo.</p>
      <Explorer brands={BRANDS} countries={COUNTRIES} />
    </main>
  );
}
