import { useEffect, useState } from "react";
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import {
  commitConfig,
  previewConfig,
  readThemeDefaults,
  revertPreview,
  startTypographyClient,
  subscribeExternalSave,
  subscribeThemeChange,
} from "./client-runtime";
import { clearCatalog, loadCatalog, loadConfig, saveCatalog, saveConfig } from "./client-store";
import type { ResolvedRoles } from "./client-typography";
import {
  DEFAULT_CONFIG,
  ROLE_IDS,
  compareConfigVersions,
  configsEqual,
  type FontCatalog,
  type FontsConfig,
} from "./domain";
import {
  classifyFontAccessError,
  discoverLocalFonts,
  getFontAccessState,
  isElectronClient,
  watchLocalFontPermission,
  type FontAccessState,
} from "./font-discovery";
import { RoleSettings } from "./components/role-settings";
import { Button } from "./components/ui/button";
import "./app.css";

function formatScanTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function getWriterId() {
  const key = "bb-plugin-fonts:writer:v1";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const created = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem(key, created);
  return created;
}

function fontAccessCopy(state: FontAccessState, desktop: boolean) {
  switch (state) {
    case "unsupported":
      return { title: "Installed fonts unavailable", description: "This browser cannot list local fonts. Choose a generic family or type any family name." };
    case "insecure":
      return { title: "Secure connection required", description: "Installed-font discovery requires HTTPS or localhost. Generic and manually entered families remain available." };
    case "denied":
      return { title: "Font access denied", description: "Allow local-font access in this browser's site settings, then try again. Generic and manual choices remain available." };
    case "blocked":
      return { title: "Font access blocked", description: "Browser settings or page policy currently block local-font access. Enable it if available, then try again." };
    case "failed":
      return { title: "Could not load installed fonts", description: "Try again, or choose a generic family or type any family name." };
    default:
      return {
        title: "Installed fonts",
        description: desktop
          ? "Load the fonts installed on this device. The catalog stays on this client."
          : "Allow this browser to list local fonts. Names remain on this client.",
      };
  }
}

function FontsSettings() {
  const [saved, setSaved] = useState<FontsConfig>(loadConfig);
  const [draft, setDraft] = useState<FontsConfig>(saved);
  const [catalog, setCatalog] = useState<FontCatalog | null>(() => loadCatalog());
  const [resolved, setResolved] = useState<ResolvedRoles | null>(null);
  const [status, setStatus] = useState("");
  const [scanStatus, setScanStatus] = useState("");
  const [scanning, setScanning] = useState(false);
  const [fontAccessState, setFontAccessState] = useState<FontAccessState>(() => getFontAccessState());
  const [externalSave, setExternalSave] = useState<FontsConfig | null>(null);
  const dirty = !configsEqual(saved, draft);
  const desktop = isElectronClient();
  const accessCopy = fontAccessCopy(fontAccessState, desktop);
  const advancedSupported = typeof document === "undefined"
    || Boolean(getComputedStyle(document.documentElement).getPropertyValue("--text-sm").trim());

  const refreshThemeDefaults = () => {
    const next = readThemeDefaults();
    if (next) setResolved(next);
  };

  useEffect(() => {
    const frame = requestAnimationFrame(refreshThemeDefaults);
    const unsubscribeTheme = subscribeThemeChange(refreshThemeDefaults);
    return () => {
      cancelAnimationFrame(frame);
      unsubscribeTheme();
    };
  }, []);

  useEffect(() => {
    let dispose: () => void = () => undefined;
    let active = true;
    void watchLocalFontPermission((permission) => {
      if (!active) return;
      if (permission === "denied" || permission === "prompt") {
        clearCatalog();
        setCatalog(null);
        setFontAccessState(permission === "denied" ? "denied" : getFontAccessState());
      } else if (permission === "granted" && getFontAccessState() === "available") {
        setFontAccessState("available");
      }
    }).then((nextDispose) => {
      if (active) dispose = nextDispose;
      else nextDispose();
    });
    return () => {
      active = false;
      dispose();
    };
  }, []);

  useEffect(() => {
    previewConfig(draft);
  }, [draft]);

  useEffect(() => () => revertPreview(), []);

  useEffect(() => subscribeExternalSave((config) => {
    if (compareConfigVersions(config, saved) <= 0) return;
    setSaved(config);
    if (dirty) {
      setExternalSave(config);
      return;
    }
    setDraft(config);
  }), [dirty, saved.revision]);

  const scan = async () => {
    setScanning(true);
    setScanStatus("Reading installed families…");
    try {
      const discovered = await discoverLocalFonts();
      let next = discovered;
      let cacheFailed = false;
      try {
        next = saveCatalog(discovered);
      } catch {
        cacheFailed = true;
        setScanStatus(`${discovered.families.length} families loaded for this session; the catalog could not be cached.`);
      }
      setCatalog(next);
      setFontAccessState("available");
      if (!cacheFailed) setScanStatus(`${next.families.length} families loaded`);
    } catch (error) {
      const nextState = classifyFontAccessError(error);
      setFontAccessState(nextState);
      if (nextState === "denied" || nextState === "blocked") {
        clearCatalog();
        setCatalog(null);
      }
      setScanStatus(nextState === "failed" ? error instanceof Error ? error.message : String(error) : "");
    } finally {
      setScanning(false);
    }
  };

  const save = () => {
    setStatus("Saving…");
    try {
      const revision = Math.max(saved.revision + 1, Date.now());
      const next = saveConfig({ ...draft, revision, writer: getWriterId() });
      commitConfig(next);
      setSaved(next);
      setDraft(next);
      setExternalSave(null);
      setStatus("Saved");
    } catch (error) {
      setStatus(`Could not save: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const discard = () => {
    setDraft(saved);
    setExternalSave(null);
    setStatus("Changes discarded");
  };

  return (
    <div className="fonts-settings">
      <div className="fonts-intro">
        <div>
          <h3>Typography that stays yours</h3>
          <p>Choose local families and tune their rhythm without changing your active color theme.</p>
        </div>
        <div className="fonts-catalog-status">
          <span>{catalog ? `${catalog.families.length} font families` : "No font catalog yet"}</span>
          {catalog && <small>Last scanned {formatScanTime(catalog.scannedAt)}</small>}
        </div>
      </div>

      <div className="fonts-discovery">
        <div aria-live="polite">
          <strong>{accessCopy.title}</strong>
          <p>{accessCopy.description}</p>
          {scanStatus && <p className="fonts-scan-result">{scanStatus}</p>}
        </div>
        {!(["unsupported", "insecure"] as FontAccessState[]).includes(fontAccessState) && (
          <Button type="button" onClick={() => void scan()} disabled={scanning}>
            {scanning ? "Loading…" : fontAccessState === "available" ? catalog ? "Rescan fonts" : desktop ? "Load installed fonts" : "Allow font access" : "Try again"}
          </Button>
        )}
      </div>

      {externalSave && (
        <div className="fonts-notice" role="alert">
          <div><strong>Newer settings were saved in another window.</strong><p>Your unsaved preview is still intact.</p></div>
          <Button size="small" type="button" onClick={() => {
            setSaved(externalSave);
            setDraft(externalSave);
            setExternalSave(null);
          }}>Use newer settings</Button>
        </div>
      )}

      <div className="fonts-roles">
        {ROLE_IDS.map((role) => (
          <RoleSettings
            key={role}
            role={role}
            config={draft.roles[role]}
            resolved={resolved?.[role] ?? null}
            catalog={catalog}
            advancedSupported={advancedSupported}
            onChange={(roleConfig) => {
              setStatus("");
              setDraft((current) => ({
                ...current,
                roles: { ...current.roles, [role]: roleConfig },
              }));
            }}
          />
        ))}
      </div>

      <div className="fonts-savebar">
        <Button type="button" size="small" variant="quiet" disabled={configsEqual(draft, DEFAULT_CONFIG)} onClick={() => {
          setStatus("");
          setDraft({ ...DEFAULT_CONFIG, revision: draft.revision });
        }}>
          Reset all to theme defaults
        </Button>
        <div className="fonts-savebar-actions">
          <span role="status">{status || (dirty ? "Unsaved changes" : "All changes saved")}</span>
          <Button type="button" variant="quiet" disabled={!dirty} onClick={discard}>Discard</Button>
          <Button type="button" variant="primary" disabled={!dirty} onClick={save}>Save settings</Button>
        </div>
      </div>
    </div>
  );
}

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "typography-client",
    mount({ signal }) {
      return startTypographyClient(signal);
    },
  });
  app.slots.settingsSection({
    id: "font-settings",
    title: "Fonts",
    component: FontsSettings,
  });
});
