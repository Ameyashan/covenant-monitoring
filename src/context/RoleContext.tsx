'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type Role = 'Loan Officer' | 'Relationship Manager' | 'Compliance Officer' | 'Senior Management' | 'Operations Analyst';

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType>({
  role: 'Senior Management',
  setRole: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('Senior Management');
  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
