import React, { createContext, useContext, useEffect, useState } from "react";
import { BusinessConfig, validateBusinessConfig } from "./config.schema";
import { DESKTO_CONFIG_PRESET } from "./desktoconfig";
import { siteConfigApi } from "../lib/api";


// ─────────────────────────────────────────────────────────────────────────────
// Tenant Config Context
// ─────────────────────────────────────────────────────────────────────────────
const TenantConfigContext = createContext<BusinessConfig>(DESKTO_CONFIG_PRESET);

export const useTenantConfig = () => {
  return useContext(TenantConfigContext);
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature Flags Hook
// ─────────────────────────────────────────────────────────────────────────────
export const useFeatureFlags = () => {
  const config = useTenantConfig();
  return {
    isEnabled: (flagName: keyof BusinessConfig["features"]): boolean => {
      return !!config.features[flagName];
    },
    flags: config.features,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Theme Provider & Engine
// ─────────────────────────────────────────────────────────────────────────────
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const config = useTenantConfig();
  const theme = config.theme;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    
    // Inject dynamic CSS custom properties
    root.style.setProperty("--primary", theme.primaryColor);
    root.style.setProperty("--accent", "#56d6ff");
    root.style.setProperty("--ring", "rgba(86, 214, 255, 0.45)");
    root.style.setProperty("--secondary", theme.secondaryColor);
    root.style.setProperty("--background", theme.backgroundColor);
    root.style.setProperty("--foreground", theme.textColor);
    root.style.setProperty("--radius", theme.borderRadius);
    root.style.setProperty("--font-sans", theme.fontFamily);

    // Dynamic styles injection for scrollbar, focus, and selection overlays
    let styleTag = document.getElementById("tenant-dynamic-theme-styles");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "tenant-dynamic-theme-styles";
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      :root {
        font-family: var(--font-sans), system-ui, -apple-system, sans-serif !important;
      }
      ::-webkit-scrollbar-thumb {
        background: var(--primary) !important;
      }
      .glass-pill-primary {
        color: #fff !important;
        background: rgba(5, 7, 9, 0.52) !important;
        border-color: rgba(255, 45, 85, 0.62) !important;
        box-shadow: 0 0 0 1px rgba(86,214,255,.08), 0 0 24px rgba(255,45,85,.10) !important;
      }
      .glass-pill-primary:hover {
        background: rgba(86,214,255,.08) !important;
        border-color: rgba(86,214,255,.58) !important;
        color: #fff !important;
      }
      .glass-pill-primary:focus-visible {
        outline: none !important;
        border-color: rgba(86,214,255,.76) !important;
        box-shadow: 0 0 0 3px rgba(86,214,255,.16), 0 0 24px rgba(86,214,255,.18) !important;
      }
      .glass-red {
        color: var(--primary) !important;
        border-color: var(--primary) !important;
      }
      .text-primary-color {
        color: var(--primary) !important;
      }
      .border-primary-color {
        border-color: var(--primary) !important;
      }
      .bg-primary-color {
        background-color: var(--primary) !important;
      }
    `;
  }, [theme]);

  return <>{children}</>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Global Tenant Config Provider
// ─────────────────────────────────────────────────────────────────────────────
interface ProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<BusinessConfig>;
}

export const TenantConfigProvider: React.FC<ProviderProps> = ({ children, initialConfig }) => {
  const [config, setConfig] = useState<BusinessConfig>(() => {
    try {
      if (initialConfig) {
        return validateBusinessConfig({ ...DESKTO_CONFIG_PRESET, ...initialConfig });
      }
      return DESKTO_CONFIG_PRESET;
    } catch (e) {
      console.error("Failed to validate tenant configuration, using defaults", e);
      return DESKTO_CONFIG_PRESET;
    }
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const data = await siteConfigApi.getPublishedConfig();
        if (data && data.config) {
          const validated = validateBusinessConfig(data.config);
          setConfig(validated);
        }
      } catch (err) {
        console.warn("[TenantConfigProvider] Backend site config load failed, using local presets:", err);
      }
    }
    loadConfig();
  }, []);

  return (
    <TenantConfigContext.Provider value={config}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </TenantConfigContext.Provider>
  );
};
