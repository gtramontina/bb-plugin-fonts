import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { SelectChevron } from "./font-picker";

export interface PreviewOption {
  value: string;
  label: string;
  style?: CSSProperties;
}

interface PreviewSelectProps {
  label: string;
  value: string;
  options: PreviewOption[];
  disabled?: boolean;
  onChange(value: string): void;
}

export function PreviewSelect({ label, value, options, disabled = false, onChange }: PreviewSelectProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = options[selectedIndex]!;

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setActiveIndex(index);
    setOpen(false);
  };

  return (
    <div className="fonts-preview-select" ref={rootRef}>
      <button
        type="button"
        className="fonts-select-trigger"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        disabled={disabled}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.min(options.length - 1, current + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => Math.max(0, current - 1));
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            choose(activeIndex);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <span style={selected.style}>{selected.label}</span>
        <SelectChevron open={open} />
      </button>
      {open && (
        <div className="fonts-options" id={`${id}-listbox`} role="listbox">
          {options.map((option, index) => (
            <div
              id={`${id}-option-${index}`}
              key={option.value || "theme"}
              role="option"
              aria-selected={index === selectedIndex}
              className="fonts-option"
              data-active={index === activeIndex}
              onPointerMove={() => setActiveIndex(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <span style={option.style}>{option.label}</span>
              {index === selectedIndex && <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3 3 7-7" /></svg>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
