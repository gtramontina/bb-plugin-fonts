import {
  DEFAULT_CONFIG,
  normalizeConfig,
  normalizeStoredCatalog,
  type FontCatalog,
  type FontsConfig,
} from "./domain";

export const CONFIG_STORAGE_KEY = "bb-plugin-fonts:config:v1";
export const CATALOG_STORAGE_KEY = "bb-plugin-fonts:catalog:v1";
export const CHANNEL_NAME = "bb-plugin-fonts:v1";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function readJson(storage: StorageLike, key: string): unknown {
  try {
    const stored = storage.getItem(key);
    return stored === null ? null : JSON.parse(stored);
  } catch {
    return null;
  }
}

export function loadConfig(storage: StorageLike = localStorage): FontsConfig {
  const value = readJson(storage, CONFIG_STORAGE_KEY);
  return value === null ? normalizeConfig(DEFAULT_CONFIG) : normalizeConfig(value);
}

export function saveConfig(config: FontsConfig, storage: StorageLike = localStorage) {
  const normalized = normalizeConfig(config);
  storage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadCatalog(storage: StorageLike = localStorage): FontCatalog | null {
  return normalizeStoredCatalog(readJson(storage, CATALOG_STORAGE_KEY));
}

export function saveCatalog(catalog: FontCatalog, storage: StorageLike = localStorage) {
  const normalized = normalizeStoredCatalog(catalog);
  if (!normalized) throw new Error("Invalid font catalog");
  storage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
