import { createContext } from 'react';
import type { AuthContextType } from './types';

/**
 * AuthContext is defined in its own file so that the file containing
 * <AuthProvider /> only exports a React component, which keeps Fast Refresh
 * (HMR) working as expected.
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
