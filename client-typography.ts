import {
  ROOT_TOKENS,
  buildTypographyPlan,
  type FontsConfig,
  type RoleId,
} from "./domain";

export interface ResolvedTypography {
  family: string;
  size: string;
  weight: string;
  style: string;
  lineHeight: string;
  letterSpacing: string;
}

export type ResolvedRoles = Record<RoleId, ResolvedTypography>;

export function normalizeResolvedLineHeight(fontSizeText: string, lineHeightText: string) {
  const fontSize = Number.parseFloat(fontSizeText);
  const lineHeight = Number.parseFloat(lineHeightText);
  return lineHeightText.endsWith("px") && fontSize > 0 && Number.isFinite(lineHeight)
    ? Number((lineHeight / fontSize).toFixed(2)).toString()
    : lineHeightText;
}

function measureTokenLineHeight(sizeToken: string, lineHeightToken: string) {
  const sample = document.createElement("span");
  sample.textContent = "Sample";
  sample.style.cssText = "position:fixed;visibility:hidden;pointer-events:none";
  sample.style.fontSize = `var(${sizeToken})`;
  sample.style.lineHeight = `var(${lineHeightToken})`;
  document.body.appendChild(sample);
  const computed = getComputedStyle(sample);
  const ratio = normalizeResolvedLineHeight(computed.fontSize, computed.lineHeight);
  sample.remove();
  return ratio;
}

export class TypographyController {
  private readonly styleElement: HTMLStyleElement;
  private current: FontsConfig | null = null;

  constructor(private readonly root: HTMLElement = document.documentElement) {
    this.styleElement = document.createElement("style");
    this.styleElement.dataset.bbFonts = "";
    document.head.appendChild(this.styleElement);
  }

  apply(config: FontsConfig) {
    this.styleElement.textContent = "";
    const computed = getComputedStyle(this.root);
    const themeProperties = Object.fromEntries(ROOT_TOKENS.map((token) => [token, computed.getPropertyValue(token).trim()]));
    themeProperties["--bb-interface-line-height"] = measureTokenLineHeight("--text-sm", "--text-sm--line-height");
    const plan = buildTypographyPlan(config, themeProperties);
    this.current = config;
    const rootRule = Object.entries(plan.rootProperties)
      .map(([token, value]) => `${token}:${value}!important`)
      .join(";");
    this.styleElement.textContent = `${rootRule ? `:root{${rootRule}}` : ""}\n${plan.rules}`;
  }

  readThemeDefaults(): ResolvedRoles {
    const current = this.current;
    this.styleElement.textContent = "";

    const interfaceSample = document.createElement("span");
    const codeSample = document.createElement("code");
    const serifSample = document.createElement("span");
    const samples = [
      [interfaceSample, "--font-sans", "--text-sm", "--text-sm--line-height"],
      [codeSample, "--font-mono", "--text-sm", "--text-sm--line-height"],
      [serifSample, "--font-serif", "--text-base", "--text-base--line-height"],
    ] as const;
    for (const [sample, familyToken, sizeToken, lineHeightToken] of samples) {
      sample.textContent = "Sample";
      sample.style.cssText = "position:fixed;visibility:hidden;pointer-events:none";
      sample.style.fontFamily = `var(${familyToken})`;
      sample.style.fontSize = `var(${sizeToken})`;
      sample.style.fontWeight = "var(--font-weight-normal)";
      sample.style.lineHeight = `var(${lineHeightToken})`;
      sample.style.letterSpacing = "var(--tracking-normal, normal)";
      document.body.appendChild(sample);
    }
    const read = (element: Element): ResolvedTypography => {
      const computed = getComputedStyle(element);
      return {
        family: computed.fontFamily,
        size: computed.fontSize,
        weight: computed.fontWeight,
        style: computed.fontStyle,
        lineHeight: normalizeResolvedLineHeight(computed.fontSize, computed.lineHeight),
        letterSpacing: computed.letterSpacing,
      };
    };
    const resolved = {
      interface: read(interfaceSample),
      code: read(codeSample),
      serif: read(serifSample),
    };
    interfaceSample.remove();
    codeSample.remove();
    serifSample.remove();
    if (current) this.apply(current);
    return resolved;
  }

  restore() {
    this.current = null;
    this.styleElement.remove();
  }
}
