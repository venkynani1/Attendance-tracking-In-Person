'use client';

import { createContext, useContext } from 'react';

export const UserContext = createContext({ user: null, pendingApprovals: 0, refresh: () => {} });

export function useUser() {
  return useContext(UserContext);
}
