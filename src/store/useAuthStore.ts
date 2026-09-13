import { create } from 'zustand';

import { account, ID } from '@/lib/appwrite/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  error?: string;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Não foi possível concluir. Tente novamente.';
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  error: undefined,

  hydrate: async () => {
    try {
      const current = await account.get();
      set({ status: 'authenticated', user: { id: current.$id, email: current.email, name: current.name } });
    } catch {
      set({ status: 'unauthenticated', user: null });
    }
  },

  login: async (email, password) => {
    set({ status: 'loading', error: undefined });
    try {
      await account.createEmailPasswordSession({ email, password });
      const current = await account.get();
      set({ status: 'authenticated', user: { id: current.$id, email: current.email, name: current.name } });
    } catch (error) {
      set({ status: 'unauthenticated', error: extractErrorMessage(error) });
      throw error;
    }
  },

  signup: async (email, password, name) => {
    set({ status: 'loading', error: undefined });
    try {
      await account.create({ userId: ID.unique(), email, password, name });
      await account.createEmailPasswordSession({ email, password });
      const current = await account.get();
      set({ status: 'authenticated', user: { id: current.$id, email: current.email, name: current.name } });
    } catch (error) {
      set({ status: 'unauthenticated', error: extractErrorMessage(error) });
      throw error;
    }
  },

  logout: async () => {
    try {
      await account.deleteSession({ sessionId: 'current' });
    } finally {
      set({ status: 'unauthenticated', user: null });
    }
  },
}));
