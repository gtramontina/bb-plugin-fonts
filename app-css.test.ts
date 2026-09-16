import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "app.css"),
  "utf8",
);

describe("touch editor compatibility", () => {
  it("keeps the BB composer above the iOS focus-zoom threshold", () => {
    expect(css).toMatch(
      /@media \(pointer: coarse\) \{[\s\S]*\[data-promptbox-editor-content\][\s\S]*\.ProseMirror\[contenteditable\][\s\S]*font-size: max\(16px, 1em\) !important;/,
    );
  });
});
