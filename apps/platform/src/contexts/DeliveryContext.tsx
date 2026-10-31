import React, { createContext, useContext, ReactNode } from 'react';
import { useDeliveryStore } from '@/hooks/useDeliveryStore';

type DeliveryContextType = ReturnType<typeof useDeliveryStore>;

const DeliveryContext = createContext<DeliveryContextType | null>(null);

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const store = useDeliveryStore();
  return (
    <DeliveryContext.Provider value={store}>
      {children}
    </DeliveryContext.Provider>
  );
}

export function useDelivery() {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
}
