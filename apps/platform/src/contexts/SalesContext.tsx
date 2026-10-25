import React, { createContext, useContext, ReactNode } from 'react';
import { useSalesStore } from '@/hooks/useSalesStore';

type SalesContextType = ReturnType<typeof useSalesStore>;

const SalesContext = createContext<SalesContextType | null>(null);

export function SalesProvider({ children }: { children: ReactNode }) {
  const store = useSalesStore();
  return (
    <SalesContext.Provider value={store}>
      {children}
    </SalesContext.Provider>
  );
}

export function useSales() {
  const context = useContext(SalesContext);
  if (!context) {
    throw new Error('useSales must be used within a SalesProvider');
  }
  return context;
}
