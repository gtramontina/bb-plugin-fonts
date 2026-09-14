import { normalizeCatalog, type FontCatalog, type LocalFontRecord } from "./domain";

interface LocalFontData {
  family: string;
  style: string;
}

export type FontAccessState = "available" | "unsupported" | "insecure" | "denied" | "blocked" | "failed";

interface FontAccessEnvironment {
  isSecureContext: boolean;
  queryLocalFonts?: unknown;
}

declare global {
  interface Window {
    queryLocalFonts?: () => Promise<LocalFontData[]>;
  }
}

export function getFontAccessState(
  target: FontAccessEnvironment = window,
): FontAccessState {
  if (!target.isSecureContext) return "insecure";
  return typeof target.queryLocalFonts === "function" ? "available" : "unsupported";
}

export function classifyFontAccessError(error: unknown): FontAccessState {
  if (error instanceof DOMException && error.name === "NotAllowedError") return "denied";
  if (error instanceof DOMException && error.name === "SecurityError") return "blocked";
  return "failed";
}

export async function watchLocalFontPermission(
  onChange: (state: PermissionState) => void,
  permissions: Permissions | undefined = navigator.permissions,
): Promise<() => void> {
  if (!permissions?.query) return () => undefined;
  try {
    const status = await permissions.query({ name: "local-fonts" as PermissionName });
    const changed = () => onChange(status.state);
    changed();
    status.addEventListener("change", changed);
    return () => status.removeEventListener("change", changed);
  } catch {
    return () => undefined;
  }
}

export function isElectronClient(userAgent = navigator.userAgent) {
  return /Electron/i.test(userAgent);
}

export async function discoverLocalFonts(
  query?: () => Promise<LocalFontData[]>,
): Promise<FontCatalog> {
  if (!query && getFontAccessState() !== "available") {
    throw new Error("Local font discovery is not available in this client.");
  }
  const fonts = await (query ?? (() => window.queryLocalFonts!()))();
  return normalizeCatalog(fonts.map<LocalFontRecord>(({ family, style }) => ({ family, style })));
}
