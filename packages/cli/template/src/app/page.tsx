import { redirect } from "next/navigation";
import { getManifest } from "@/lib/manifest";

export default function Home() {
  const manifest = getManifest();
  redirect(`/${manifest.defaultLocale}`);
}
