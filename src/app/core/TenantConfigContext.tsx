import React, { createContext, useContext, useEffect, useState } from "react";
import { BusinessConfig, validateBusinessConfig } from "./config.schema";
import { DESKTO_CONFIG_PRESET } from "./desktoconfig";

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
        background: var(--primary) !important;
        border-color: var(--primary) !important;
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

  return (
    <TenantConfigContext.Provider value={config}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </TenantConfigContext.Provider>
  );
};
