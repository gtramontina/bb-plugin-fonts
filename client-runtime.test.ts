// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONFIG_STORAGE_KEY, saveConfig } from "./client-store";
import {
  previewConfig,
  revertPreview,
  startTypographyClient,
  subscribeExternalSave,
} from "./client-runtime";
import { DEFAULT_CONFIG, type FontsConfig } from "./domain";

class FakeBroadcastChannel {
  static current: FakeBroadcastChannel | null = null;
  private listener: ((event: MessageEvent) => void) | null = null;

  constructor() {
    FakeBroadcastChannel.current = this;
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listener = listener;
  }

  postMessage() {}
  close() {}

  emit(config: FontsConfig) {
    this.listener?.({ data: { kind: "saved", config } } as MessageEvent);
  }
}

function config(revision: number, family: string, writer = ""): FontsConfig {
  return {
    ...DEFAULT_CONFIG,
    revision,
    writer,
    roles: {
      ...DEFAULT_CONFIG.roles,
      interface: { ...DEFAULT_CONFIG.roles.interface, family },
    },
  };
}

describe("typography client runtime", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
  });

  afterEach(() => {
    document.head.querySelectorAll("[data-bb-fonts]").forEach((element) => element.remove());
    vi.unstubAllGlobals();
  });

  it("preserves dirty previews, reports newer saves, and ignores stale messages", () => {
    saveConfig(config(1, "Saved One"));
    const abort = new AbortController();
    const dispose = startTypographyClient(abort.signal);
    previewConfig(config(1, "Draft Face"));
    let external: FontsConfig | null = null;
    const unsubscribe = subscribeExternalSave((next) => { external = next; });

    FakeBroadcastChannel.current?.emit(config(3, "Saved Three"));
    expect(external && (external as FontsConfig).roles.interface.family).toBe("Saved Three");
    expect(document.querySelector("[data-bb-fonts]")?.textContent).toContain("Draft Face");

    FakeBroadcastChannel.current?.emit(config(2, "Stale Two"));
    expect(localStorage.getItem(CONFIG_STORAGE_KEY)).toContain("Saved Three");
    FakeBroadcastChannel.current?.emit(config(3, "Converged Three", "writer-z"));
    expect(localStorage.getItem(CONFIG_STORAGE_KEY)).toContain("Converged Three");
    revertPreview();
    expect(document.querySelector("[data-bb-fonts]")?.textContent).toContain("Converged Three");

    unsubscribe();
    abort.abort();
    dispose();
  });
});
