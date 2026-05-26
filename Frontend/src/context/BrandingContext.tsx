import { createContext, useContext, useState, ReactNode } from 'react';

export interface Branding {
  companyName: string;
  logoDataUrl: string;
}

interface BrandingContextType {
  branding: Branding;
  updateBranding: (b: Partial<Branding>) => void;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: { companyName: '', logoDataUrl: '' },
  updateBranding: () => {},
});

const STORAGE_KEY = 'pdfBranding';

const loadFromStorage = (): Branding => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { companyName: '', logoDataUrl: '', ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { companyName: '', logoDataUrl: '' };
};

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [branding, setBranding] = useState<Branding>(loadFromStorage);

  const updateBranding = (b: Partial<Branding>) => {
    const next: Branding = { ...branding, ...b };
    setBranding(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return (
    <BrandingContext.Provider value={{ branding, updateBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
