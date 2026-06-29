import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CentreProfile {
  name: string;
  slogan: string;
  logoUrl: string;       // base64 data URL or empty string
  address: string;
  phone: string;
  email: string;
}

const STORAGE_KEY = 'aangan_centre_profile';

const DEFAULT_PROFILE: CentreProfile = {
  name: 'Aangan Daycare',
  slogan: 'Every child cared for.',
  logoUrl: '',
  address: '',
  phone: '',
  email: '',
};

interface CentreContextType {
  centre: CentreProfile;
  updateCentre: (profile: Partial<CentreProfile>) => void;
  isLoading: boolean;
}

const CentreContext = createContext<CentreContextType | null>(null);

export const CentreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [centre, setCentre] = useState<CentreProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCentre({ ...DEFAULT_PROFILE, ...parsed });
      }
    } catch {
      // use defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateCentre = (profile: Partial<CentreProfile>) => {
    setCentre(prev => {
      const updated = { ...prev, ...profile };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* quota */ }
      return updated;
    });
  };

  return (
    <CentreContext.Provider value={{ centre, updateCentre, isLoading }}>
      {children}
    </CentreContext.Provider>
  );
};

export const useCentre = () => {
  const ctx = useContext(CentreContext);
  if (!ctx) throw new Error('useCentre must be used within CentreProvider');
  return ctx;
};
