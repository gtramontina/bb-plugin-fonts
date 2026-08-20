import { useEffect, useId, useRef, useState } from "react";
import { searchFamilies, type FontCatalog, type RoleId } from "../domain";

interface FontPickerProps {
  role: RoleId;
  value: string | null;
  catalog: FontCatalog | null;
  onChange(value: string | null): void;
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

export function FontPicker({ role, value, catalog, onChange }: FontPickerProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const results = searchFamilies(catalog?.families ?? [], query);
  const trimmedQuery = query.trim();
  const hasExactMatch = results.some(({ family }) => family.toLocaleLowerCase() === trimmedQuery.toLocaleLowerCase());
  const options: Array<{ family: string; styles: string[]; manual?: boolean }> = [
    { family: "", styles: [] },
    ...results,
    ...(trimmedQuery && !hasExactMatch ? [{ family: trimmedQuery, styles: [], manual: true }] : []),
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

  const select = (family: string) => {
    onChange(family || null);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="fonts-picker" ref={rootRef}>
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
              select(options[index]?.family ?? "");
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
          {options.map((option, index) => {
            const family = option.family;
            const selected = family ? family === value : value === null;
            return (
              <div
                id={`${id}-option-${index}`}
                key={`${option.manual ? "manual:" : "family:"}${family || "theme"}`}
                role="option"
                aria-selected={selected}
                className="fonts-option"
                data-active={index === activeIndex}
                onPointerMove={() => setActiveIndex(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => select(family)}
              >
                <span>
                  <span style={family ? { fontFamily: `${JSON.stringify(family)}, ${fallbacks[role]}` } : undefined}>
                    {option.manual ? `Use “${family}”` : family || "Theme default"}
                  </span>
                  {option.manual
                    ? <small>Manual family name</small>
                    : family && option.styles.length > 0 && <small>{option.styles.length} {option.styles.length === 1 ? "style" : "styles"}</small>}
                </span>
                {selected && <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3 3 7-7" /></svg>}
              </div>
            );
          })}
        </div>
      )}

      <div className="fonts-picker-meta">
        {value && (
          <span className={catalog && selectedAvailable ? "fonts-available" : catalog ? "fonts-unavailable" : "fonts-picker-hint"}>
            {catalog ? selectedAvailable ? "Installed" : "Not currently available" : "Manual family"}
          </span>
        )}
        {!value && <span className="fonts-picker-hint">Search installed fonts or type any family name</span>}
      </div>
    </div>
  );
}
