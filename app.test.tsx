// @vitest-environment jsdom
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadPluginApp, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { CONFIG_STORAGE_KEY } from "./client-store";

describe("Fonts settings UI", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
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
});
