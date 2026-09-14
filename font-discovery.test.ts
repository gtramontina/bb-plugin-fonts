// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  classifyFontAccessError,
  getFontAccessState,
  watchLocalFontPermission,
} from "./font-discovery";

describe("font access capability", () => {
  it("distinguishes insecure, unsupported, and available clients", () => {
    expect(getFontAccessState({ isSecureContext: false, queryLocalFonts() {} })).toBe("insecure");
    expect(getFontAccessState({ isSecureContext: true })).toBe("unsupported");
    expect(getFontAccessState({ isSecureContext: true, queryLocalFonts() {} })).toBe("available");
  });

  it("distinguishes denied, policy-blocked, and unknown scan failures", () => {
    expect(classifyFontAccessError(new DOMException("no", "NotAllowedError"))).toBe("denied");
    expect(classifyFontAccessError(new DOMException("no", "SecurityError"))).toBe("blocked");
    expect(classifyFontAccessError(new Error("broken"))).toBe("failed");
  });

  it("observes permission revocation", async () => {
    const listeners = new Set<EventListener>();
    const status = {
      state: "granted" as PermissionState,
      addEventListener: vi.fn((_type: string, listener: EventListener) => listeners.add(listener)),
      removeEventListener: vi.fn((_type: string, listener: EventListener) => listeners.delete(listener)),
    };
    const permissions = { query: vi.fn(async () => status) } as unknown as Permissions;
    const changes: PermissionState[] = [];
    const dispose = await watchLocalFontPermission((state) => changes.push(state), permissions);
    status.state = "denied";
    for (const listener of listeners) listener(new Event("change"));
    expect(changes).toEqual(["granted", "denied"]);
    dispose();
    expect(listeners.size).toBe(0);
  });
});
