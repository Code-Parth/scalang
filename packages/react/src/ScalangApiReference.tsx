"use client";

import {
  ApiReferenceReact,
  type AnyApiReferenceConfiguration,
} from "@scalar/api-reference-react";
import { LanguageSelector } from "./LanguageSelector";

export interface ScalangApiReferenceProps {
  /** Scalar API reference configuration */
  configuration: AnyApiReferenceConfiguration;
  /** Available locale codes (e.g. ["en", "fr", "es"]) */
  locales?: string[];
  /** Currently active locale code */
  currentLocale?: string;
  /** Called when the user selects a different locale. Defaults to navigating to `/${locale}`. */
  onLocaleChange?: (locale: string) => void;
}

export function ScalangApiReference({
  configuration,
  locales,
  currentLocale,
  onLocaleChange,
}: ScalangApiReferenceProps) {
  const showLanguageSelector =
    locales && locales.length > 1 && currentLocale !== undefined;

  const handleLocaleChange = (locale: string) => {
    if (onLocaleChange) {
      onLocaleChange(locale);
    } else {
      window.location.pathname = `/${locale}`;
    }
  };

  return (
    <div className="scalang-wrapper">
      {showLanguageSelector && (
        <LanguageSelector
          locales={locales}
          currentLocale={currentLocale}
          onChange={handleLocaleChange}
        />
      )}
      <ApiReferenceReact configuration={configuration} />
    </div>
  );
}
