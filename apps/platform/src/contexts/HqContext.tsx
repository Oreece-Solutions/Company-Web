import React, { createContext, useContext, ReactNode } from 'react';
import { useHqStore } from '@/hooks/useHqStore';

type HqContextType = ReturnType<typeof useHqStore>;

const HqContext = createContext<HqContextType | null>(null);

export function HqProvider({ children }: { children: ReactNode }) {
  const store = useHqStore();
  return (
    <HqContext.Provider value={store}>
      {children}
    </HqContext.Provider>
  );
}

export function useHq() {
  const context = useContext(HqContext);
  if (!context) {
    throw new Error('useHq must be used within an HqProvider');
  }
  return context;
}
