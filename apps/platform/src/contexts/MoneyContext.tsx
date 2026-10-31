import React, { createContext, useContext, ReactNode } from 'react';
import { useMoneyStore } from '@/hooks/useMoneyStore';

type MoneyContextType = ReturnType<typeof useMoneyStore>;

const MoneyContext = createContext<MoneyContextType | null>(null);

export function MoneyProvider({ children }: { children: ReactNode }) {
  const store = useMoneyStore();
  return (
    <MoneyContext.Provider value={store}>
      {children}
    </MoneyContext.Provider>
  );
}

export function useMoney() {
  const context = useContext(MoneyContext);
  if (!context) {
    throw new Error('useMoney must be used within a MoneyProvider');
  }
  return context;
}
