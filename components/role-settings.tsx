import type { CSSProperties } from "react";
import {
  DEFAULT_CONFIG,
  type FontCatalog,
  type FontStyle,
  type RoleConfig,
  type RoleId,
} from "../domain";
import type { ResolvedTypography } from "../client-typography";
import { FontPicker } from "./font-picker";
import { PreviewSelect, type PreviewOption } from "./preview-select";
import { Button } from "./ui/button";

const roleCopy = {
  interface: {
    title: "Interface",
    description: "Navigation, controls, messages, and everyday reading.",
    sample: "Make every word feel at home.",
    fallback: "sans-serif",
  },
  code: {
    title: "Code",
    description: "Diffs, snippets, paths, previews, and terminal-style text.",
    sample: "const clarity = typography * restraint;",
    fallback: "monospace",
  },
  serif: {
    title: "Serif",
    description: "Long-form and intentionally serif prose.",
    sample: "Good tools should feel quiet and precise.",
    fallback: "serif",
  },
} as const;

interface RoleSettingsProps {
  role: RoleId;
  config: RoleConfig;
  resolved: ResolvedTypography | null;
  catalog: FontCatalog | null;
  advancedSupported: boolean;
  onChange(config: RoleConfig): void;
}

interface NumberControlProps {
  label: string;
  value: number | null;
  resolved: string;
  minimum: number;
  maximum: number;
  step: number;
  unit: string;
  fallback: number;
  disabled?: boolean;
  onChange(value: number | null): void;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function NumberControl({ label, value, resolved, minimum, maximum, step, unit, fallback, disabled = false, onChange }: NumberControlProps) {
  const enabled = value !== null;
  const activeValue = value ?? clamp(Number.parseFloat(resolved) || fallback, minimum, maximum);
  const update = (next: string) => {
    const parsed = Number(next);
    if (Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum) onChange(parsed);
  };
  return (
    <div className="fonts-control">
      <div className="fonts-control-heading">
        <label>
          <input type="checkbox" checked={enabled} disabled={disabled} onChange={(event) => onChange(event.target.checked ? activeValue : null)} />
          <span>{label}</span>
        </label>
        {!enabled && <span>Theme · {resolved || "inherited"}</span>}
      </div>
      <span className="fonts-number-input" data-disabled={!enabled}>
        <input aria-label={`${label} value`} type="number" min={minimum} max={maximum} step={step} value={activeValue} disabled={!enabled || disabled} onChange={(event) => update(event.target.value)} />
        <span>{unit}</span>
      </span>
    </div>
  );
}

function previewStyle(role: RoleId, config: RoleConfig, resolved: ResolvedTypography | null): CSSProperties {
  const family = config.family
    ? `${JSON.stringify(config.family)}, ${roleCopy[role].fallback}`
    : resolved?.family ?? `var(--font-${role === "interface" ? "sans" : role === "code" ? "mono" : "serif"})`;
  return {
    fontFamily: family,
    fontSize: config.size === null ? resolved?.size : `${config.size}px`,
    fontWeight: config.weight ?? resolved?.weight,
    fontStyle: (config.style ?? resolved?.style) as CSSProperties["fontStyle"],
    lineHeight: config.lineHeight ?? resolved?.lineHeight,
    letterSpacing: config.letterSpacing === null ? resolved?.letterSpacing : `${config.letterSpacing}em`,
  };
}

export function RoleSettings({ role, config, resolved, catalog, advancedSupported, onChange }: RoleSettingsProps) {
  const copy = roleCopy[role];
  const patch = (value: Partial<RoleConfig>) => onChange({ ...config, ...value });
  const hasOverrides = Object.values(config).some((value) => value !== null);
  const weightOptions: PreviewOption[] = [
    { value: "", label: `Theme default · ${resolved?.weight ?? "inherited"}`, style: { fontWeight: resolved?.weight ?? 400 } },
    ...[100, 200, 300, 400, 500, 600, 700, 800, 900].map((weight) => ({
      value: String(weight),
      label: `${weight}${weight === 400 ? " Regular" : weight === 500 ? " Medium" : weight === 600 ? " Semibold" : weight === 700 ? " Bold" : ""}`,
      style: { fontWeight: weight },
    })),
  ];
  const styleOptions: PreviewOption[] = [
    { value: "", label: `Theme default · ${resolved?.style ?? "inherited"}`, style: { fontStyle: (resolved?.style ?? "normal") as CSSProperties["fontStyle"] } },
    { value: "normal", label: "Normal", style: { fontStyle: "normal" } },
    { value: "italic", label: "Italic", style: { fontStyle: "italic" } },
    { value: "oblique", label: "Oblique", style: { fontStyle: "oblique" } },
  ];
  return (
    <section className="fonts-role" aria-labelledby={`fonts-${role}-title`}>
      <div className="fonts-role-heading">
        <div>
          <h3 id={`fonts-${role}-title`}>{copy.title}</h3>
          <p>{copy.description}</p>
        </div>
        <Button type="button" size="small" variant="quiet" disabled={!hasOverrides} onClick={() => onChange({ ...DEFAULT_CONFIG.roles[role] })}>Reset role</Button>
      </div>

      <div className="fonts-controls" role="group" aria-label={`${copy.title} typography controls`}>
        {!advancedSupported && role === "interface" && (
          <p className="fonts-compatibility">This BB version does not expose the expected typography scale. Family and style remain available; scale controls are disabled.</p>
        )}
        <FontPicker role={role} value={config.family} catalog={catalog} onChange={(family) => patch({ family })} />
        <div className="fonts-control fonts-control--select">
          <label>Weight</label>
          <PreviewSelect label={`${copy.title} weight`} value={config.weight === null ? "" : String(config.weight)} options={weightOptions} disabled={role === "interface" && !advancedSupported} onChange={(value) => patch({ weight: value ? Number(value) : null })} />
        </div>
        <div className="fonts-control fonts-control--select">
          <label>Style</label>
          <PreviewSelect label={`${copy.title} style`} value={config.style ?? ""} options={styleOptions} onChange={(value) => patch({ style: (value || null) as FontStyle | null })} />
        </div>
        <NumberControl label="Font size" value={config.size} resolved={resolved?.size ?? ""} minimum={10} maximum={24} step={0.5} unit="px" fallback={role === "serif" ? 16 : role === "code" ? 13 : 14} disabled={role === "interface" && !advancedSupported} onChange={(size) => patch({ size })} />
        <NumberControl label="Line height" value={config.lineHeight} resolved={resolved?.lineHeight ?? ""} minimum={1} maximum={2} step={0.01} unit="×" fallback={1.5} disabled={role === "interface" && !advancedSupported} onChange={(lineHeight) => patch({ lineHeight })} />
        <NumberControl label="Letter spacing" value={config.letterSpacing} resolved={resolved?.letterSpacing ?? ""} minimum={-0.1} maximum={0.2} step={0.005} unit="em" fallback={0} disabled={role === "interface" && !advancedSupported} onChange={(letterSpacing) => patch({ letterSpacing })} />
      </div>

      <div className="fonts-specimen" role="group" aria-label={`${copy.title} preview`}>
        <span>{copy.title} specimen</span>
        {role === "code"
          ? <code style={previewStyle(role, config, resolved)}>{copy.sample}</code>
          : <p style={previewStyle(role, config, resolved)}>{copy.sample}</p>}
      </div>
    </section>
  );
}
