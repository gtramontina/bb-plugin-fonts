import { CHANNEL_NAME, loadConfig, saveConfig } from "./client-store";
import { TypographyController, type ResolvedRoles } from "./client-typography";
import { compareConfigVersions, normalizeConfig, type FontsConfig } from "./domain";

const PREVIEW_EVENT = "bb-fonts:preview";
const REVERT_EVENT = "bb-fonts:revert";
const SAVE_EVENT = "bb-fonts:save";
const EXTERNAL_SAVE_EVENT = "bb-fonts:external-save";
const THEME_EVENT = "bb-fonts:theme-change";

interface SavedMessage {
  kind: "saved";
  config: FontsConfig;
}

let activeController: TypographyController | null = null;

export function previewConfig(config: FontsConfig) {
  window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: normalizeConfig(config) }));
}

export function revertPreview() {
  window.dispatchEvent(new Event(REVERT_EVENT));
}

export function commitConfig(config: FontsConfig) {
  window.dispatchEvent(new CustomEvent(SAVE_EVENT, { detail: normalizeConfig(config) }));
}

export function readThemeDefaults(): ResolvedRoles | null {
  return activeController?.readThemeDefaults() ?? null;
}

export function subscribeExternalSave(listener: (config: FontsConfig) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<FontsConfig>).detail);
  window.addEventListener(EXTERNAL_SAVE_EVENT, handler);
  return () => window.removeEventListener(EXTERNAL_SAVE_EVENT, handler);
}

export function subscribeThemeChange(listener: () => void) {
  window.addEventListener(THEME_EVENT, listener);
  return () => window.removeEventListener(THEME_EVENT, listener);
}

export function startTypographyClient(signal: AbortSignal) {
  const controller = new TypographyController();
  activeController = controller;
  let previewing = false;
  let saved = loadConfig();
  let applied = saved;
  controller.apply(saved);
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL_NAME);

  const onPreview = (event: Event) => {
    previewing = true;
    applied = (event as CustomEvent<FontsConfig>).detail;
    controller.apply(applied);
  };
  const onRevert = () => {
    previewing = false;
    saved = loadConfig();
    applied = saved;
    controller.apply(saved);
  };
  const onSave = (event: Event) => {
    const next = (event as CustomEvent<FontsConfig>).detail;
    try {
      saved = saveConfig(next);
    } catch {
      saved = normalizeConfig(next);
    }
    applied = saved;
    controller.apply(applied);
    channel?.postMessage({ kind: "saved", config: saved } satisfies SavedMessage);
  };
  const onMessage = (event: MessageEvent<SavedMessage>) => {
    if (event.data?.kind !== "saved") return;
    const next = normalizeConfig(event.data.config);
    if (compareConfigVersions(next, saved) <= 0) return;
    try {
      saved = saveConfig(next);
    } catch {
      saved = next;
    }
    if (previewing) {
      window.dispatchEvent(new CustomEvent(EXTERNAL_SAVE_EVENT, { detail: saved }));
    } else {
      applied = saved;
      controller.apply(applied);
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage || !event.key?.includes("bb-plugin-fonts:config")) return;
    const next = loadConfig();
    if (compareConfigVersions(next, saved) <= 0) return;
    saved = next;
    if (previewing) window.dispatchEvent(new CustomEvent(EXTERNAL_SAVE_EVENT, { detail: saved }));
    else {
      applied = saved;
      controller.apply(applied);
      window.dispatchEvent(new CustomEvent(EXTERNAL_SAVE_EVENT, { detail: saved }));
    }
  };
  const observer = new MutationObserver(() => {
    controller.apply(applied);
    window.dispatchEvent(new Event(THEME_EVENT));
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "data-color-mode"],
  });

  window.addEventListener(PREVIEW_EVENT, onPreview, { signal });
  window.addEventListener(REVERT_EVENT, onRevert, { signal });
  window.addEventListener(SAVE_EVENT, onSave, { signal });
  window.addEventListener("storage", onStorage, { signal });
  channel?.addEventListener("message", onMessage);

  return () => {
    observer.disconnect();
    channel?.close();
    controller.restore();
    if (activeController === controller) activeController = null;
  };
}
