import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export type SiteSettings = {
  siteName: string;
  logoUrl: string;
  primaryColor: string; // any valid CSS color (oklch / hex / hsl)
};

const DEFAULTS: SiteSettings = {
  siteName: "Valora",
  logoUrl: "",
  primaryColor: "oklch(0.70 0.20 280)",
};

const SiteSettingsContext = createContext<SiteSettings>(DEFAULTS);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);

  useEffect(() => {
    const ref = doc(firestore, "settings", "site");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data() as Partial<SiteSettings>;
          setSettings({
            siteName: d.siteName || DEFAULTS.siteName,
            logoUrl: d.logoUrl || "",
            primaryColor: d.primaryColor || DEFAULTS.primaryColor,
          });
        }
      },
      (err) => console.warn("[site-settings] firestore read failed:", err.message),
    );
    return () => unsub();
  }, []);

  // Apply primary color + document title globally
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty("--primary", settings.primaryColor);
    document.title = settings.siteName;
  }, [settings.primaryColor, settings.siteName]);

  return (
    <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>
  );
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
