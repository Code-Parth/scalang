import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ScalangApiReference,
  type AnyApiReferenceConfiguration,
} from "@scalang/react";
import { getManifest } from "@/lib/manifest";
import { getScalarConfig } from "@/lib/config";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export default async function LangPage({ params }: PageProps) {
  const { lang } = await params;
  const manifest = getManifest();

  if (!manifest.locales.includes(lang)) {
    notFound();
  }

  const specPath = resolve(process.cwd(), `public/specs/${lang}.json`);

  if (!existsSync(specPath)) {
    console.error(`Spec file not found: ${specPath}`);
    notFound();
  }

  let spec: Record<string, unknown>;
  try {
    const raw = readFileSync(specPath, "utf-8");
    spec = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load spec for locale "${lang}":`, err);
    notFound();
  }

  const scalarConfig = getScalarConfig();

  const configuration: AnyApiReferenceConfiguration = {
    ...scalarConfig,
    content: spec,
  };

  return (
    <ScalangApiReference
      configuration={configuration}
      locales={manifest.locales}
      currentLocale={lang}
    />
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;

  const specPath = resolve(process.cwd(), `public/specs/${lang}.json`);
  let title = "API Reference";

  try {
    if (existsSync(specPath)) {
      const raw = readFileSync(specPath, "utf-8");
      const spec = JSON.parse(raw);
      if (spec?.info?.title) {
        title = spec.info.title;
      }
    }
  } catch {
    // Fallback to default title
  }

  return {
    title: `${title} (${lang.toUpperCase()})`,
    description: `API Reference documentation in ${lang}`,
  };
}
