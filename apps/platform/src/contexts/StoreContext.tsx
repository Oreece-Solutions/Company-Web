import React, { createContext, useContext, ReactNode } from 'react';
import { useSupabaseStore } from '@/hooks/useSupabaseStore';

type StoreContextType = ReturnType<typeof useSupabaseStore>;

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useSupabaseStore();
  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within a StoreProvider');
  }
  return context;
}
