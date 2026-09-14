# Fonts for bb

Fonts is a client-local typography layer for [bb](https://getbb.app). It lets
each desktop window or browser profile choose installed font families and tune
type independently of the active color theme.

![Fonts settings showing family, weight, style, size, line-height, letter-spacing, and live specimens](assets/readme/settings.png)

## Features

- Separate Interface, Code, and Serif roles.
- Searchable local-font catalog with manual family-name fallback.
- Portable generic families that work without font discovery.
- Per-role size, weight, style, line height, and letter spacing.
- Live previews with explicit Save and Discard actions.
- Theme inheritance per property and clean restoration when disabled.
- Client-local, versioned storage with cross-window synchronization.
- No telemetry and no font catalog sent to the bb server.

Local font enumeration uses Chromium's Local Font Access API. Desktop bb loads
the installed catalog after a user action. Browser clients may also ask for
permission. Unsupported clients retain manual family entry.

## Remote access

Fonts works through BB Connect and other secure browser origins. Installed-font
discovery uses fonts on the device viewing BB, not fonts on the BB server.
Desktop Chromium browsers provide the full picker after permission is granted;
other browsers and mobile clients retain generic families and manual entry.

In the Expo mobile app, Fonts applies to BB's web content inside the WebView.
Native pairing, device-settings, and notification screens keep the mobile app's
system typography because web plugins cannot style React Native components.

Settings and scanned font metadata stay in that browser profile and origin.
They are not synchronized with the desktop app or other devices, which may have
different fonts installed. Changing a BB Connect handle creates a new browser
origin and therefore a separate set of settings.

## Install

```sh
npm install
npm run build
bb plugin install .
```

Open **Settings → Plugins → Fonts**. The plugin contributes no color theme;
your selected typography remains active as palettes change.

## Development

```sh
npm test
npm run typecheck
npm run build
bb plugin reload fonts
```

## Boundaries

Fonts styles the BB document and plugin UI. Embedded websites, isolated browser
content, canvas terminals, and third-party shadow roots may retain their own
typography. Interface scale controls use bb's current typography variables and
degrade to family/style controls if those variables are unavailable.
Fixed-size renderers such as terminals, diffs, Monaco, and some editor roots may
also keep their component-owned sizes.

## License

MIT
