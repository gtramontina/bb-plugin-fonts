// @vitest-environment jsdom
import { fireEvent, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { CATALOG_STORAGE_KEY, CONFIG_STORAGE_KEY, saveCatalog } from "./client-store";

describe("Fonts settings UI", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "permissions", { configurable: true, value: undefined });
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      value: vi.fn(async () => [
        { family: "Avenir Next", style: "Regular" },
        { family: "Berkeley Mono", style: "Regular" },
      ]),
    });
  });

  it("discovers fonts, previews a selection, and saves client-local settings", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(app.settingsSections[0]!, {});

    expect(await slot.findByText("Typography that stays yours")).toBeTruthy();
    fireEvent.click(slot.getByRole("button", { name: /font access|installed fonts/i }));
    expect(await slot.findByText("2 families loaded")).toBeTruthy();

    const picker = slot.getAllByRole("combobox")[0]!;
    fireEvent.focus(picker);
    fireEvent.change(picker, { target: { value: "Avenir" } });
    fireEvent.keyDown(picker, { key: "ArrowDown" });
    fireEvent.keyDown(picker, { key: "Enter" });
    expect((picker as HTMLInputElement).value).toBe("Avenir Next");

    const save = slot.getByRole("button", { name: "Save settings" });
    expect((save as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(save);
    expect(slot.getByText("Saved")).toBeTruthy();
    expect(localStorage.getItem(CONFIG_STORAGE_KEY)).toContain("Avenir Next");
    slot.lifecycle.unmount();
  });

  it("shows compact typography controls without disclosures or sliders", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(app.settingsSections[0]!, {});
    expect(slot.queryByText("Advanced typography")).toBeNull();
    expect(slot.queryByText("Enter font name manually")).toBeNull();
    expect(slot.getAllByRole("button", { name: "Reset role" }).every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    expect(slot.queryByLabelText("Font size slider")).toBeNull();
    expect(await slot.findAllByLabelText("Font size value")).toHaveLength(3);
    expect(slot.getAllByLabelText("Letter spacing value")).toHaveLength(3);
    slot.lifecycle.unmount();
  });

  it("accepts a manual family through the searchable picker", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(app.settingsSections[0]!, {});
    const picker = (await slot.findAllByRole("combobox"))[0]!;
    fireEvent.focus(picker);
    fireEvent.change(picker, { target: { value: "Custom Sans" } });
    expect(slot.getByText("Use “Custom Sans”")).toBeTruthy();
    fireEvent.keyDown(picker, { key: "Enter" });
    expect((picker as HTMLInputElement).value).toBe("Custom Sans");
    expect(slot.getByText("Manual family")).toBeTruthy();
    slot.lifecycle.unmount();
  });

  it("offers generic families when installed-font discovery is unsupported", async () => {
    Object.defineProperty(window, "queryLocalFonts", { configurable: true, value: undefined });
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(app.settingsSections[0]!, {});
    expect(await slot.findByText("Installed fonts unavailable")).toBeTruthy();
    expect(slot.queryByRole("button", { name: "Allow font access" })).toBeNull();
    const picker = slot.getAllByRole("combobox")[0]!;
    fireEvent.focus(picker);
    expect(slot.getByText("Generic families")).toBeTruthy();
    expect(slot.getByRole("group", { name: "Generic families" })).toBeTruthy();
    fireEvent.blur(picker, { relatedTarget: slot.getByRole("button", { name: "Save settings" }) });
    expect(picker.getAttribute("aria-expanded")).toBe("false");
    fireEvent.focus(picker);
    fireEvent.click(slot.getByText("system-ui"));
    expect((picker as HTMLInputElement).value).toBe("system-ui");
    expect(slot.getByText("Generic family")).toBeTruthy();
    slot.lifecycle.unmount();
  });

  it("explains insecure browser origins without offering a scan", async () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: false });
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(app.settingsSections[0]!, {});
    expect(await slot.findByText("Secure connection required")).toBeTruthy();
    expect(slot.queryByRole("button", { name: "Allow font access" })).toBeNull();
    slot.lifecycle.unmount();
  });

  it("distinguishes policy blocking from unexpected scan failures", async () => {
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      value: vi.fn(async () => { throw new DOMException("blocked", "SecurityError"); }),
    });
    const app = await loadPluginApp(() => import("./app"));
    const blocked = renderSlot(app.settingsSections[0]!, {});
    fireEvent.click(await blocked.findByRole("button", { name: "Allow font access" }));
    expect(await blocked.findByText("Font access blocked")).toBeTruthy();
    blocked.lifecycle.unmount();

    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      value: vi.fn(async () => { throw new Error("Font service unavailable"); }),
    });
    const failed = renderSlot(app.settingsSections[0]!, {});
    fireEvent.click(await failed.findByRole("button", { name: "Allow font access" }));
    expect(await failed.findByText("Could not load installed fonts")).toBeTruthy();
    expect(failed.getByText("Font service unavailable")).toBeTruthy();
    failed.lifecycle.unmount();
  });

  it("clears cached font metadata when access is denied", async () => {
    saveCatalog({ version: 1, scannedAt: 1, families: [{ family: "Inter", styles: ["Regular"] }] });
    Object.defineProperty(window, "queryLocalFonts", {
      configurable: true,
      value: vi.fn(async () => { throw new DOMException("denied", "NotAllowedError"); }),
    });
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(app.settingsSections[0]!, {});
    fireEvent.click(await slot.findByRole("button", { name: "Rescan fonts" }));
    expect(await slot.findByText("Font access denied")).toBeTruthy();
    expect(localStorage.getItem(CATALOG_STORAGE_KEY)).toBeNull();
    slot.lifecycle.unmount();
  });

  it("clears cached metadata when a prior permission returns to prompt", async () => {
    saveCatalog({ version: 1, scannedAt: 1, families: [{ family: "Inter", styles: ["Regular"] }] });
    const status = {
      state: "prompt" as PermissionState,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query: vi.fn(async () => status) },
    });
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(app.settingsSections[0]!, {});
    expect(await slot.findByText("No font catalog yet")).toBeTruthy();
    expect(localStorage.getItem(CATALOG_STORAGE_KEY)).toBeNull();
    slot.lifecycle.unmount();
  });

  it("ranks generic matches and shares one result cap across groups", async () => {
    saveCatalog({
      version: 1,
      scannedAt: 1,
      families: Array.from({ length: 60 }, (_, index) => ({ family: `Installed ${index}`, styles: ["Regular"] })),
    });
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(app.settingsSections[0]!, {});
    const picker = slot.getAllByRole("combobox")[0]!;
    fireEvent.focus(picker);
    expect(slot.getAllByRole("option")).toHaveLength(51); // Theme default plus 50 family results.
    fireEvent.change(picker, { target: { value: "serif" } });
    expect(slot.getAllByRole("option")[1]?.textContent).toContain("serifPortable CSS family");
    slot.lifecycle.unmount();
  });

  it("allows incremental editing of numeric values before committing", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(app.settingsSections[0]!, {});
    const interfaceRole = within(await slot.findByRole("region", { name: "Interface" }));
    fireEvent.click(interfaceRole.getByRole("checkbox", { name: "Font size" }));
    const input = interfaceRole.getByRole("spinbutton", { name: "Font size value" }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    fireEvent.change(input, { target: { value: "2" } });
    expect(input.value).toBe("2");
    fireEvent.change(input, { target: { value: "20" } });
    fireEvent.blur(input);
    expect(input.value).toBe("20");
    slot.lifecycle.unmount();
  });

  it("snaps committed numeric values to their increment", async () => {
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(app.settingsSections[0]!, {});
    const interfaceRole = within(await slot.findByRole("region", { name: "Interface" }));
    fireEvent.click(interfaceRole.getByRole("checkbox", { name: "Font size" }));
    const size = interfaceRole.getByRole("spinbutton", { name: "Font size value" }) as HTMLInputElement;
    fireEvent.change(size, { target: { value: "17.3" } });
    fireEvent.blur(size);
    expect(size.value).toBe("17.5");

    fireEvent.click(interfaceRole.getByRole("checkbox", { name: "Line height" }));
    const lineHeight = interfaceRole.getByRole("spinbutton", { name: "Line height value" }) as HTMLInputElement;
    fireEvent.change(lineHeight, { target: { value: "1.634" } });
    fireEvent.blur(lineHeight);
    expect(lineHeight.value).toBe("1.63");
    slot.lifecycle.unmount();
  });

  it("reports revoked permission as denied rather than policy blocked", async () => {
    saveCatalog({ version: 1, scannedAt: 1, families: [{ family: "Inter", styles: ["Regular"] }] });
    const status = {
      state: "denied" as PermissionState,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, "permissions", {
      configurable: true,
      value: { query: vi.fn(async () => status) },
    });
    const app = await loadPluginApp(() => import("./app"));
    const slot = renderSlot(app.settingsSections[0]!, {});
    expect(await slot.findByText("Font access denied")).toBeTruthy();
    expect(localStorage.getItem(CATALOG_STORAGE_KEY)).toBeNull();
    slot.lifecycle.unmount();
  });
});
