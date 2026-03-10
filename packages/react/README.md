# @scalang/react

React components for rendering multilingual [Scalar](https://scalar.com) API references, powered by [Scalang](https://github.com/Code-Parth/scalang).

Provides a drop-in wrapper around `@scalar/api-reference-react` with a language selector bar, branding section, and theme-aware styling.

## Installation

```bash
npm install @scalang/react
```

**Peer dependencies:** `react`, `react-dom`

## Usage

### Basic Setup

```tsx
import { ScalangApiReference } from "@scalang/react";
import "@scalang/react/style.css";

export default function ApiDocs() {
  return (
    <ScalangApiReference
      configuration={{ spec: { url: "/specs/en.json" } }}
      locales={["en", "fr", "de", "ja"]}
      currentLocale="en"
    />
  );
}
```

### Custom Locale Change Handler

By default, clicking a locale tag navigates to `/{locale}`. Override this with `onLocaleChange`:

```tsx
<ScalangApiReference
  configuration={{ spec: { url: `/specs/${locale}.json` } }}
  locales={["en", "fr", "de"]}
  currentLocale={locale}
  onLocaleChange={(newLocale) => {
    router.push(`/docs/${newLocale}`);
  }}
/>
```

### Single Locale (No Language Bar)

When only one locale is provided, the language selector bar is hidden:

```tsx
<ScalangApiReference
  configuration={{ spec: { url: "/openapi.json" } }}
  locales={["en"]}
  currentLocale="en"
/>
```

## Components

### `ScalangApiReference`

Main wrapper component. Renders the language selector bar above Scalar's API reference viewer.

| Prop             | Type                              | Description                                              |
| ---------------- | --------------------------------- | -------------------------------------------------------- |
| `configuration`  | `ReferenceProps["configuration"]` | Scalar API reference configuration                       |
| `locales`        | `string[]`                        | Available locale codes                                   |
| `currentLocale`  | `string`                          | Active locale code                                       |
| `onLocaleChange` | `(locale: string) => void`        | Locale change handler (default: navigate to `/{locale}`) |

### `LanguageSelector`

Tag-style navigation bar with locale pills and branding. Used internally by `ScalangApiReference`.

| Prop             | Type                       | Description            |
| ---------------- | -------------------------- | ---------------------- |
| `locales`        | `string[]`                 | Available locale codes |
| `currentLocale`  | `string`                   | Active locale code     |
| `onLocaleChange` | `(locale: string) => void` | Locale change handler  |

## Styling

Import the stylesheet for the language bar:

```tsx
import "@scalang/react/style.css";
```

The component uses Scalar CSS custom properties for theme integration, with sensible fallbacks:

- `--scalar-sidebar-background-1` — bar background
- `--scalar-color-1` — text and tag colors
- `--scalar-color-accent` — active tag highlight

### Custom Styling

Override the CSS classes to customize appearance:

```css
.scalang-lang-bar {
  /* Language bar container */
}

.scalang-lang-tag {
  /* Individual locale pill */
}

.scalang-lang-tag.active {
  /* Active locale pill */
}

.scalang-brand-section {
  /* Right-aligned branding area */
}
```

### Responsive

The language bar is responsive — on screens ≤560px, locale tags scroll horizontally and the branding section stacks below.

## Next.js Compatibility

The package includes a `"use client"` directive in the built output, so it works in Next.js App Router without additional configuration.

## License

MIT
