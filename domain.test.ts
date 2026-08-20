import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  buildTypographyPlan,
  normalizeCatalog,
  normalizeConfig,
  searchFamilies,
} from "./domain";

describe("font settings domain", () => {
  it("normalizes malformed configuration to safe theme defaults", () => {
    expect(normalizeConfig({
      revision: 2.9,
      roles: { interface: { family: "  Avenir Next  ", size: 99, weight: 450, style: "wide" } },
    })).toEqual({
      ...DEFAULT_CONFIG,
      revision: 2,
      roles: {
        ...DEFAULT_CONFIG.roles,
        interface: { ...DEFAULT_CONFIG.roles.interface, family: "Avenir Next", weight: 500 },
      },
    });
  });

  it("deduplicates and cleans local font families", () => {
    expect(normalizeCatalog([
      { family: "Inter", style: "Regular" },
      { family: "inter", style: "Bold" },
      { family: ".SF NS", style: "Regular" },
      { family: "", style: "Regular" },
    ], 42)).toEqual({
      version: 1,
      scannedAt: 42,
      families: [{ family: "Inter", styles: ["Bold", "Regular"] }],
    });
  });

  it("ranks exact, prefix, word-prefix, and substring matches", () => {
    const families = ["Mono Sans", "Sans Mono", "Monotype", "Demonology"]
      .map((family) => ({ family, styles: [] }));
    expect(searchFamilies(families, "mono").map(({ family }) => family)).toEqual([
      "Mono Sans",
      "Monotype",
      "Sans Mono",
      "Demonology",
    ]);
  });

  it("builds a relative interface scale and exact semantic role rules", () => {
    const plan = buildTypographyPlan({
      roles: {
        interface: { family: "Avenir Next", size: 14, weight: 400, lineHeight: 1.5, letterSpacing: 0, style: "normal" },
        code: { family: "Berkeley Mono", size: 13, weight: 500, lineHeight: 1.6, letterSpacing: 0.01, style: "normal" },
        serif: {},
      },
    });
    expect(plan.rootProperties["--font-sans"]).toBe('"Avenir Next", sans-serif');
    expect(plan.rootProperties["--text-sm"]).toBe("14px");
    expect(plan.rootProperties["--font-weight-semibold"]).toBe("600");
    expect(plan.rules).toContain("code,pre,kbd,samp");
    expect(plan.rules).toContain("font-size:13px!important");
  });

  it("scales from the active theme instead of replacing its hierarchy", () => {
    const plan = buildTypographyPlan({
      roles: {
        interface: { size: 16, weight: 500, lineHeight: 1.6, letterSpacing: 0.01 },
        code: {},
        serif: {},
      },
    }, {
      "--text-xs": "11px",
      "--text-sm": "14px",
      "--font-weight-normal": "350",
      "--font-weight-semibold": "650",
      "--bb-interface-line-height": "1.6",
      "--text-sm--line-height": "1.6",
      "--leading-normal": "1.4",
      "--tracking-normal": "0.005em",
    });
    expect(plan.rootProperties["--text-xs"]).toBe("12.571px");
    expect(plan.rootProperties["--font-weight-semibold"]).toBe("800");
    expect(plan.rootProperties["--text-sm--line-height"]).toBe("calc((1.6) * 1)");
    expect(plan.rootProperties["--tracking-normal"]).toContain("+ 0.005em");
    expect(plan.rules).not.toContain("body,button");
  });
});
