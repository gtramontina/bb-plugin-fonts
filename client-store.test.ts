import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "./domain";
import { loadCatalog, loadConfig, saveCatalog, saveConfig } from "./client-store";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("client font storage", () => {
  it("recovers safely from invalid JSON", () => {
    const storage = memoryStorage();
    storage.setItem("bb-plugin-fonts:config:v1", "{");
    expect(loadConfig(storage)).toEqual(DEFAULT_CONFIG);
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
