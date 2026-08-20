export const ROLE_IDS = ["interface", "code", "serif"] as const;
export type RoleId = (typeof ROLE_IDS)[number];
export type FontStyle = "normal" | "italic" | "oblique";

export interface RoleConfig {
  family: string | null;
  size: number | null;
  weight: number | null;
  style: FontStyle | null;
  lineHeight: number | null;
  letterSpacing: number | null;
}

export interface FontsConfig {
  version: 1;
  revision: number;
  writer: string;
  roles: Record<RoleId, RoleConfig>;
}

export interface FontFamily {
  family: string;
  styles: string[];
}

export interface FontCatalog {
  version: 1;
  scannedAt: number;
  families: FontFamily[];
}

export interface LocalFontRecord {
  family: string;
  style: string;
}

export interface TypographyPlan {
  rootProperties: Record<string, string>;
  rules: string;
}

const EMPTY_ROLE: RoleConfig = {
  family: null,
  size: null,
  weight: null,
  style: null,
  lineHeight: null,
  letterSpacing: null,
};

export const DEFAULT_CONFIG: FontsConfig = {
  version: 1,
  revision: 0,
  writer: "",
  roles: {
    interface: { ...EMPTY_ROLE },
    code: { ...EMPTY_ROLE },
    serif: { ...EMPTY_ROLE },
  },
};

const numberBounds = {
  size: [10, 24, 0.5],
  weight: [100, 900, 100],
  lineHeight: [1, 2, 0.01],
  letterSpacing: [-0.1, 0.2, 0.005],
} as const;

function normalizeNumber(
  value: unknown,
  key: keyof typeof numberBounds,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const [minimum, maximum, step] = numberBounds[key];
  if (value < minimum || value > maximum) return null;
  return Number((Math.round(value / step) * step).toFixed(3));
}

function normalizeRole(value: unknown): RoleConfig {
  const input = value && typeof value === "object"
    ? (value as Partial<RoleConfig>)
    : {};
  const family = typeof input.family === "string" && input.family.trim()
    ? input.family.trim().slice(0, 200)
    : null;
  const style = input.style === "normal" || input.style === "italic" || input.style === "oblique"
    ? input.style
    : null;
  return {
    family,
    size: normalizeNumber(input.size, "size"),
    weight: normalizeNumber(input.weight, "weight"),
    style,
    lineHeight: normalizeNumber(input.lineHeight, "lineHeight"),
    letterSpacing: normalizeNumber(input.letterSpacing, "letterSpacing"),
  };
}

export function normalizeConfig(value: unknown): FontsConfig {
  const input = value && typeof value === "object"
    ? (value as Partial<FontsConfig>)
    : {};
  const roles = input.roles && typeof input.roles === "object"
    ? input.roles as Partial<Record<RoleId, RoleConfig>>
    : {};
  return {
    version: 1,
    revision: typeof input.revision === "number" && Number.isFinite(input.revision)
      ? Math.max(0, Math.floor(input.revision))
      : 0,
    writer: typeof input.writer === "string" ? input.writer.slice(0, 100) : "",
    roles: {
      interface: normalizeRole(roles.interface),
      code: normalizeRole(roles.code),
      serif: normalizeRole(roles.serif),
    },
  };
}

export function normalizeCatalog(
  records: LocalFontRecord[],
  scannedAt = Date.now(),
): FontCatalog {
  const families = new Map<string, FontFamily>();
  for (const record of records) {
    const family = record.family.trim();
    if (!family || family.startsWith(".")) continue;
    const key = family.toLocaleLowerCase();
    const existing = families.get(key) ?? { family, styles: [] };
    const style = record.style.trim();
    if (style && !existing.styles.some((item) => item.toLocaleLowerCase() === style.toLocaleLowerCase())) {
      existing.styles.push(style);
    }
    families.set(key, existing);
  }
  return {
    version: 1,
    scannedAt,
    families: [...families.values()]
      .map((item) => ({ ...item, styles: item.styles.sort((a, b) => a.localeCompare(b)) }))
      .sort((a, b) => a.family.localeCompare(b.family)),
  };
}

export function normalizeStoredCatalog(value: unknown): FontCatalog | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<FontCatalog>;
  if (input.version !== 1 || typeof input.scannedAt !== "number" || !Array.isArray(input.families)) return null;
  const records = input.families.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const family = (entry as Partial<FontFamily>).family;
    const styles = (entry as Partial<FontFamily>).styles;
    if (typeof family !== "string") return [];
    return (Array.isArray(styles) ? styles : [""])
      .filter((style): style is string => typeof style === "string")
      .map((style) => ({ family, style }));
  });
  return normalizeCatalog(records, input.scannedAt);
}

function matchRank(family: string, query: string): number {
  const candidate = family.toLocaleLowerCase();
  if (candidate === query) return 0;
  if (candidate.startsWith(query)) return 1;
  if (candidate.split(/\s+/).some((word) => word.startsWith(query))) return 2;
  return candidate.includes(query) ? 3 : -1;
}

export function searchFamilies(
  families: FontFamily[],
  query: string,
  limit = 50,
): FontFamily[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return families
    .map((family) => ({ family, rank: normalizedQuery ? matchRank(family.family, normalizedQuery) : 1 }))
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.family.family.localeCompare(b.family.family))
    .slice(0, limit)
    .map(({ family }) => family);
}

const ROOT_FONT_TOKENS: Record<RoleId, string> = {
  interface: "--font-sans",
  code: "--font-mono",
  serif: "--font-serif",
};

const TEXT_SCALE = {
  "--text-xs": 12 / 14,
  "--text-sm": 1,
  "--text-base": 16 / 14,
  "--text-lg": 18 / 14,
  "--text-xl": 20 / 14,
} as const;

export const ROOT_TOKENS = [
  ...Object.values(ROOT_FONT_TOKENS),
  ...Object.keys(TEXT_SCALE),
  ...Object.keys(TEXT_SCALE).map((token) => `${token}--line-height`),
  "--font-weight-light",
  "--font-weight-normal",
  "--font-weight-medium",
  "--font-weight-semibold",
  "--leading-tight",
  "--leading-snug",
  "--leading-normal",
  "--leading-relaxed",
  "--tracking-tight",
  "--tracking-normal",
  "--tracking-wide",
  "--tracking-wider",
  "--tracking-widest",
] as const;

function clampWeight(value: number) {
  return Math.min(900, Math.max(100, value));
}

function format(value: number, digits = 3) {
  return Number(value.toFixed(digits)).toString();
}

function declarations(config: RoleConfig, includeSize: boolean) {
  const values: string[] = [];
  if (includeSize && config.size !== null) values.push(`font-size:${format(config.size)}px`);
  if (config.weight !== null) values.push(`font-weight:${config.weight}`);
  if (config.style !== null) values.push(`font-style:${config.style}`);
  if (config.lineHeight !== null) values.push(`line-height:${format(config.lineHeight)}`);
  if (config.letterSpacing !== null) values.push(`letter-spacing:${format(config.letterSpacing)}em`);
  return values.map((value) => `${value}!important`).join(";");
}

export function buildTypographyPlan(
  configValue: unknown,
  themeProperties: Record<string, string> = {},
): TypographyPlan {
  const config = normalizeConfig(configValue);
  const rootProperties: Record<string, string> = {};
  for (const role of ROLE_IDS) {
    const family = config.roles[role].family;
    if (family) rootProperties[ROOT_FONT_TOKENS[role]] = `${JSON.stringify(family)}, ${role === "code" ? "monospace" : role === "serif" ? "serif" : "sans-serif"}`;
  }

  const ui = config.roles.interface;
  if (ui.size !== null) {
    const themeBase = Number.parseFloat(themeProperties["--text-sm"] ?? "") || 14;
    const scale = ui.size / themeBase;
    for (const [token, ratio] of Object.entries(TEXT_SCALE)) {
      const themeValue = Number.parseFloat(themeProperties[token] ?? "");
      rootProperties[token] = `${format(Number.isFinite(themeValue) ? themeValue * scale : ui.size * ratio)}px`;
    }
  }
  if (ui.weight !== null) {
    const themeNormal = Number.parseFloat(themeProperties["--font-weight-normal"] ?? "") || 400;
    const offset = ui.weight - themeNormal;
    for (const [token, fallback] of Object.entries({
      "--font-weight-light": 300,
      "--font-weight-normal": 400,
      "--font-weight-medium": 500,
      "--font-weight-semibold": 600,
    })) {
      const themeValue = Number.parseFloat(themeProperties[token] ?? "") || fallback;
      rootProperties[token] = String(clampWeight(themeValue + offset));
    }
  }
  if (ui.lineHeight !== null) {
    const themeNormal = Number.parseFloat(themeProperties["--bb-interface-line-height"] ?? "")
      || Number.parseFloat(themeProperties["--leading-normal"] ?? "")
      || 1.5;
    const scale = ui.lineHeight / themeNormal;
    for (const token of [...Object.keys(TEXT_SCALE).map((item) => `${item}--line-height`), "--leading-tight", "--leading-snug", "--leading-normal", "--leading-relaxed"]) {
      const themeValue = themeProperties[token];
      rootProperties[token] = themeValue ? `calc((${themeValue}) * ${format(scale, 5)})` : format(ui.lineHeight);
    }
  }
  if (ui.letterSpacing !== null) {
    const themeNormal = Number.parseFloat(themeProperties["--tracking-normal"] ?? "") || 0;
    const offset = ui.letterSpacing - themeNormal;
    for (const [token, fallback] of Object.entries({
      "--tracking-tight": -0.025,
      "--tracking-normal": 0,
      "--tracking-wide": 0.025,
      "--tracking-wider": 0.05,
      "--tracking-widest": 0.1,
    })) {
      const themeValue = themeProperties[token];
      rootProperties[token] = themeValue
        ? `calc((${themeValue}) + ${format(offset)}em)`
        : `${format(fallback + ui.letterSpacing)}em`;
    }
  }

  const rules: string[] = [];
  const uiRules = ui.style === null ? "" : `font-style:${ui.style}!important`;
  if (uiRules) rules.push(`body,button,input,textarea,select{${uiRules}}`);
  const codeRules = declarations(config.roles.code, true);
  if (codeRules) rules.push(`code,pre,kbd,samp,.font-mono,[class*="font-mono"]{${codeRules}}`);
  const serifRules = declarations(config.roles.serif, true);
  if (serifRules) rules.push(`.font-serif,[class*="font-serif"]{${serifRules}}`);
  return { rootProperties, rules: rules.join("\n") };
}

export function configsEqual(left: FontsConfig, right: FontsConfig) {
  return JSON.stringify({ ...left, revision: 0, writer: "" }) === JSON.stringify({ ...right, revision: 0, writer: "" });
}

export function compareConfigVersions(left: FontsConfig, right: FontsConfig) {
  return left.revision - right.revision || left.writer.localeCompare(right.writer);
}
