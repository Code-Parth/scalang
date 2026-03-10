import { getManifest } from "@/lib/manifest";

export default function LangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

export async function generateStaticParams() {
  const manifest = getManifest();
  return manifest.locales.map((lang) => ({ lang }));
}
