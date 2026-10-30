import React, { createContext, useContext, ReactNode } from 'react';
import { useSalesDeptStore } from '@/hooks/useSalesDeptStore';

type SalesDeptContextType = ReturnType<typeof useSalesDeptStore>;

const SalesDeptContext = createContext<SalesDeptContextType | null>(null);

export function SalesDeptProvider({ children }: { children: ReactNode }) {
  const store = useSalesDeptStore();
  return (
    <SalesDeptContext.Provider value={store}>
      {children}
    </SalesDeptContext.Provider>
  );
}

export function useSalesDept() {
  const context = useContext(SalesDeptContext);
  if (!context) {
    throw new Error('useSalesDept must be used within a SalesDeptProvider');
  }
  return context;
}
