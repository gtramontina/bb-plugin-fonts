// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { TypographyController, normalizeResolvedLineHeight } from "./client-typography";
import { DEFAULT_CONFIG } from "./domain";

describe("typography controller", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style");
    document.head.querySelectorAll("[data-bb-fonts]").forEach((element) => element.remove());
  });

  it("applies independent font roles above theme CSS and restores prior values", () => {
    document.documentElement.style.setProperty("--font-sans", "Theme Sans");
    const controller = new TypographyController();
    controller.apply({
      ...DEFAULT_CONFIG,
      roles: {
        ...DEFAULT_CONFIG.roles,
        interface: { ...DEFAULT_CONFIG.roles.interface, family: "Avenir Next" },
        code: { ...DEFAULT_CONFIG.roles.code, family: "Berkeley Mono", size: 13 },
      },
    });
    expect(document.documentElement.style.getPropertyValue("--font-sans")).toBe("Theme Sans");
    expect(document.head.querySelector("[data-bb-fonts]")?.textContent).toContain('Avenir Next');
    expect(document.head.querySelector("[data-bb-fonts]")?.textContent).toContain("font-size:13px!important");
    controller.restore();
    expect(document.documentElement.style.getPropertyValue("--font-sans")).toBe("Theme Sans");
  });

  it("reports pixel line height as a unitless ratio for the controls", () => {
    expect(normalizeResolvedLineHeight("16px", "24px")).toBe("1.5");
    expect(normalizeResolvedLineHeight("16px", "normal")).toBe("normal");
  });
});
