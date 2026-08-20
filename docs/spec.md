# Fonts product specification

Fonts is a polished, publishable bb plugin that controls client-local typography
without participating in bb's color-theme system.

## Required behavior

1. Provide independent Interface, Code, and Serif typography roles.
2. Let each role inherit its family, size, weight, style, line height, and letter spacing from the active theme or override them independently.
3. Preserve bb's relative interface hierarchy when changing the Interface base size, weight, line height, or spacing.
4. Keep saved overrides active while color themes change and restore the theme exactly when overrides are cleared or the plugin is disabled.
5. Preview drafts immediately in the current window; persist only through Save and restore saved settings through Discard or unmount.
6. Synchronize saved settings across windows in one client profile. Preserve a dirty draft and warn when another window saves newer settings.

## Font discovery

1. Enumerate local font metadata only after a user action through `queryLocalFonts()`.
2. Use desktop copy that says Load installed fonts and browser copy that says Allow font access.
3. Normalize to family names, remove hidden names, deduplicate case-insensitively, sort by locale, and retain style names for context.
4. Rank picker search as exact, prefix, word-prefix, then substring, capped at 50 visible results.
5. Cache only the normalized client-local catalog and expose explicit Rescan fonts. Do not assign an age-based expiry.
6. Keep manual family entry available when discovery is denied or unsupported.

## Controls

1. Font size: 10–24px in 0.5px steps.
2. Weight: theme default or 100–900 in increments of 100.
3. Style: theme default, Normal, Italic, or Oblique.
4. Line height: unitless 1.0–2.0 in 0.01 steps.
5. Letter spacing: -0.10em–0.20em in 0.005em steps.
6. Pair numeric sliders with editable values, keyboard operation, resolved theme context, per-role reset, and global reset.

## Privacy and persistence

1. Store configuration and cached family metadata in versioned client-local storage.
2. Never send the font catalog, selected families, or typography settings to the bb server, logs, or analytics.
3. Store a single family name, never arbitrary CSS syntax.

## Delivery quality

1. Use the name Fonts, package `bb-plugin-fonts`, and plugin-owned `Aa` branding.
2. Follow bb's existing settings visual language on desktop and compact clients.
3. Include domain, storage, content-script, and frontend tests; typechecking; successful plugin build; documentation; CI; and the MIT license.
