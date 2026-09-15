import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "./domain";
import { CONFIG_STORAGE_KEY, LEGACY_CONFIG_STORAGE_KEY, loadCatalog, loadConfig, saveCatalog, saveConfig } from "./client-store";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe("client font storage", () => {
  it("recovers safely from invalid JSON", () => {
    const storage = memoryStorage();
    storage.setItem("bb-plugin-fonts:config:v1", "{");
    expect(loadConfig(storage)).toEqual(DEFAULT_CONFIG);
  });

  it("loads v1 settings when no v2 settings exist", () => {
    const storage = memoryStorage();
    storage.setItem(LEGACY_CONFIG_STORAGE_KEY, JSON.stringify({
      version: 1,
      roles: { code: { family: "Berkeley Mono" } },
    }));
    const config = loadConfig(storage);
    expect(config.version).toBe(2);
    expect(config.roles.code).toMatchObject({ family: "Berkeley Mono", familyKind: "named" });
    saveConfig(config, storage);
    expect(storage.getItem(CONFIG_STORAGE_KEY)).not.toBeNull();
  });

  it("persists the v1 migration so v2 becomes the stored format", () => {
    const storage = memoryStorage();
    storage.setItem(LEGACY_CONFIG_STORAGE_KEY, JSON.stringify({
      version: 1,
      roles: { code: { family: "Berkeley Mono" } },
    }));
    const migrated = loadConfig(storage);
    expect(JSON.parse(storage.getItem(CONFIG_STORAGE_KEY)!)).toEqual(migrated);
    expect(storage.getItem(LEGACY_CONFIG_STORAGE_KEY)).toBeNull();
    expect(loadConfig(storage)).toEqual(migrated);
  });

  it("round-trips normalized configuration and catalogs", () => {
    const storage = memoryStorage();
    const config = saveConfig({
      ...DEFAULT_CONFIG,
      revision: 3,
      roles: { ...DEFAULT_CONFIG.roles, code: { ...DEFAULT_CONFIG.roles.code, family: "  Mono  " } },
    }, storage);
    expect(loadConfig(storage)).toEqual(config);

    const catalog = saveCatalog({
      version: 1,
      scannedAt: 8,
      families: [{ family: "Inter", styles: ["Regular"] }],
    }, storage);
    expect(loadCatalog(storage)).toEqual(catalog);
  });
});
