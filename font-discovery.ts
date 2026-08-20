import { normalizeCatalog, type FontCatalog, type LocalFontRecord } from "./domain";

interface LocalFontData {
  family: string;
  style: string;
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<LocalFontData[]>;
  }
}

export function supportsLocalFontAccess(target: Window = window) {
  return typeof target.queryLocalFonts === "function";
}

export function isElectronClient(userAgent = navigator.userAgent) {
  return /Electron/i.test(userAgent);
}

export async function discoverLocalFonts(
  query?: () => Promise<LocalFontData[]>,
): Promise<FontCatalog> {
  if (!query && !supportsLocalFontAccess()) {
    throw new Error("Local font discovery is not available in this client.");
  }
  const fonts = await (query ?? (() => window.queryLocalFonts!()))();
  return normalizeCatalog(fonts.map<LocalFontRecord>(({ family, style }) => ({ family, style })));
}
