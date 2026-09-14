import { useEffect, useId, useRef, useState } from "react";
import {
  GENERIC_FAMILIES,
  searchFamilies,
  type FontCatalog,
  type FontFamilyKind,
  type RoleId,
} from "../domain";

interface FontPickerProps {
  role: RoleId;
  value: string | null;
  familyKind: FontFamilyKind;
  catalog: FontCatalog | null;
  onChange(value: string | null, familyKind: FontFamilyKind): void;
}

interface PickerOption {
  family: string;
  familyKind: FontFamilyKind;
  styles: string[];
  group?: "Generic families" | "Installed on this device";
  manual?: boolean;
}

const fallbacks: Record<RoleId, string> = {
  interface: "sans-serif",
  code: "monospace",
  serif: "serif",
};

export function SelectChevron({ open }: { open: boolean }) {
  return (
    <svg className="fonts-chevron" viewBox="0 0 16 16" aria-hidden="true" data-open={open}>
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

export function FontPicker({ role, value, familyKind, catalog, onChange }: FontPickerProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLocaleLowerCase();
  const rankedGenericFamilies = searchFamilies(
    GENERIC_FAMILIES.map((family) => ({ family, styles: [] })),
    query,
    GENERIC_FAMILIES.length,
  );
  const rankedInstalledFamilies = searchFamilies(catalog?.families ?? [], query);
  const hasExactMatch = [...rankedGenericFamilies, ...rankedInstalledFamilies]
    .some(({ family }) => family.toLocaleLowerCase() === normalizedQuery);
  const familyResultLimit = trimmedQuery && !hasExactMatch ? 49 : 50;
  const genericOptions: PickerOption[] = rankedGenericFamilies
    .slice(0, familyResultLimit)
    .map(({ family }) => ({ family, familyKind: "generic", styles: [], group: "Generic families" }));
  const installedOptions: PickerOption[] = rankedInstalledFamilies
    .slice(0, familyResultLimit - genericOptions.length)
    .map(({ family, styles }) => ({ family, familyKind: "named", styles, group: "Installed on this device" }));
  const options: PickerOption[] = [
    { family: "", familyKind: "named", styles: [] },
    ...genericOptions,
    ...installedOptions,
    ...(trimmedQuery && !hasExactMatch
      ? [{ family: trimmedQuery, familyKind: "named" as const, styles: [], manual: true }]
      : []),
  ];
  const selectedAvailable = value === null || catalog === null || catalog.families.some(
    ({ family }) => family.toLocaleLowerCase() === value.toLocaleLowerCase(),
  );

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const select = (option: PickerOption) => {
    onChange(option.family || null, option.familyKind);
    setQuery("");
    setOpen(false);
  };

  const renderOption = (option: PickerOption, index: number) => {
    const selected = option.family
      ? option.family === value && option.familyKind === familyKind
      : value === null;
    return (
      <div
        id={`${id}-option-${index}`}
        key={`${option.manual ? "manual:" : `${option.familyKind}:`}${option.family || "theme"}`}
        role="option"
        aria-selected={selected}
        className="fonts-option"
        data-active={index === activeIndex}
        onPointerMove={() => setActiveIndex(index)}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => select(option)}
      >
        <span>
          <span style={option.familyKind === "named" && option.family ? { fontFamily: `${JSON.stringify(option.family)}, ${fallbacks[role]}` } : option.family ? { fontFamily: `${option.family}, ${fallbacks[role]}` } : undefined}>
            {option.manual ? `Use “${option.family}”` : option.family || "Theme default"}
          </span>
          {option.manual
            ? <small>Manual family name</small>
            : option.familyKind === "generic"
              ? <small>Portable CSS family</small>
              : option.family && option.styles.length > 0 && <small>{option.styles.length} {option.styles.length === 1 ? "style" : "styles"}</small>}
        </span>
        {selected && <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3 3 7-7" /></svg>}
      </div>
    );
  };

  return (
    <div className="fonts-picker" ref={rootRef} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <label htmlFor={`${id}-input`} className="fonts-field-label">Font family</label>
      <div className="fonts-combobox">
        <input
          id={`${id}-input`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
          placeholder="Search installed fonts or enter a family name"
          value={open ? query : value ?? "Theme default"}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.min(options.length - 1, current + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(0, current - 1));
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              const index = activeIndex === 0 && trimmedQuery ? 1 : activeIndex;
              select(options[index] ?? options[0]!);
            } else if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
          }}
        />
        <button type="button" className="fonts-combobox-toggle" aria-label="Toggle font list" onClick={() => setOpen((current) => !current)}>
          <SelectChevron open={open} />
        </button>
      </div>

      {open && (
        <div className="fonts-options" id={`${id}-listbox`} role="listbox">
          {renderOption(options[0]!, 0)}
          {genericOptions.length > 0 && (
            <div role="group" aria-labelledby={`${id}-generic-label`}>
              <div className="fonts-option-group" id={`${id}-generic-label`}>Generic families</div>
              {genericOptions.map((option, offset) => renderOption(option, offset + 1))}
            </div>
          )}
          {installedOptions.length > 0 && (
            <div role="group" aria-labelledby={`${id}-installed-label`}>
              <div className="fonts-option-group" id={`${id}-installed-label`}>Installed on this device</div>
              {installedOptions.map((option, offset) => renderOption(option, offset + 1 + genericOptions.length))}
            </div>
          )}
          {options.at(-1)?.manual && renderOption(options.at(-1)!, options.length - 1)}
        </div>
      )}

      <div className="fonts-picker-meta">
        {value && (
          <span className={familyKind === "generic" ? "fonts-picker-hint" : catalog && selectedAvailable ? "fonts-available" : catalog ? "fonts-unavailable" : "fonts-picker-hint"}>
            {familyKind === "generic" ? "Generic family" : catalog ? selectedAvailable ? "Installed" : "Not currently available" : "Manual family"}
          </span>
        )}
        {!value && <span className="fonts-picker-hint">Search installed fonts or type any family name</span>}
      </div>
    </div>
  );
}
