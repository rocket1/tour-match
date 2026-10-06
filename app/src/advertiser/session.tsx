import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { ApiError, request } from "../api";
import type { AdvertiserAccount, AdvertiserConfig, Campaign, CampaignContent, Charge, SavedCard } from "../types";

const TOKEN_KEY = "tourmatch.advertiser.token";

// Keychain/Keystore on devices; SecureStore has no web implementation.
const tokenStore = {
  get: () => (Platform.OS === "web" ? AsyncStorage.getItem(TOKEN_KEY) : SecureStore.getItemAsync(TOKEN_KEY)),
  set: (v: string) => (Platform.OS === "web" ? AsyncStorage.setItem(TOKEN_KEY, v) : SecureStore.setItemAsync(TOKEN_KEY, v)),
  clear: () => (Platform.OS === "web" ? AsyncStorage.removeItem(TOKEN_KEY) : SecureStore.deleteItemAsync(TOKEN_KEY)),
};

export interface SignupInput {
  email: string;
  password: string;
  companyName: string;
  contactName: string;
  website: string | null;
  termsVersion: string;
  acceptTerms: boolean;
}

/** Typed client for the /advertisers/me API, bound to a session token. */
function makeApi(token: string | null, onUnauthorized: () => void) {
  const call = async <T,>(path: string, init: RequestInit = {}) => {
    try {
      return await request<T>(`/advertisers/me${path}`, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token ?? ""}` },
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onUnauthorized();
      throw e;
    }
  };
  const post = <T,>(path: string, body?: unknown) =>
    call<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

  return {
    account: () => call<{ account: AdvertiserAccount }>("/account"),
    updateAccount: (patch: Partial<Pick<AdvertiserAccount, "companyName" | "contactName" | "website">>) =>
      call<{ account: AdvertiserAccount }>("/account", { method: "PATCH", body: JSON.stringify(patch) }),
    changePassword: (currentPassword: string, newPassword: string) =>
      post<{ token: string }>("/password", { currentPassword, newPassword }),

    billing: () => call<{ billingEnabled: boolean; card: SavedCard | null; charges: Charge[] }>("/billing"),
    createSetupIntent: () => post<{ clientSecret: string; publishableKey: string }>("/billing/setup-intent"),
    saveCard: (setupIntentId: string) => post<{ card: SavedCard }>("/billing/card", { setupIntentId }),
    removeCard: () => call<{ ok: true }>("/billing/card", { method: "DELETE" }),

    campaigns: () => call<{ campaigns: Campaign[] }>("/campaigns"),
    campaign: (id: string) => call<{ campaign: Campaign }>(`/campaigns/${id}`),
    createCampaign: (c: CampaignContent) => post<{ campaign: Campaign }>("/campaigns", c),
    updateCampaign: (id: string, c: CampaignContent) =>
      call<{ campaign: Campaign }>(`/campaigns/${id}`, { method: "PUT", body: JSON.stringify(c) }),
    deleteCampaign: (id: string) => call<{ ok: true }>(`/campaigns/${id}`, { method: "DELETE" }),
    launch: (id: string, addBudgetCents: number, endDate: string | null) =>
      post<{ campaign: Campaign }>(`/campaigns/${id}/launch`, { addBudgetCents, endDate }),
    pause: (id: string) => post<{ campaign: Campaign }>(`/campaigns/${id}/pause`),
    resume: (id: string) => post<{ campaign: Campaign }>(`/campaigns/${id}/resume`),
    stop: (id: string) => post<{ campaign: Campaign; refundedCents: number }>(`/campaigns/${id}/stop`),
    duplicate: (id: string) => post<{ campaign: Campaign }>(`/campaigns/${id}/duplicate`),
  };
}

export type AdvertiserApi = ReturnType<typeof makeApi>;

interface Session {
  ready: boolean;
  account: AdvertiserAccount | null;
  config: AdvertiserConfig | null;
  api: AdvertiserApi;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignupInput) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  replaceToken: (token: string) => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function AdvertiserProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<AdvertiserAccount | null>(null);
  const [config, setConfig] = useState<AdvertiserConfig | null>(null);
  const [ready, setReady] = useState(false);

  const clear = useCallback(async () => {
    setToken(null);
    setAccount(null);
    await tokenStore.clear().catch(() => {});
  }, []);

  const api = useMemo(() => makeApi(token, () => void clear()), [token, clear]);

  useEffect(() => {
    request<AdvertiserConfig>("/advertisers/config")
      .then(setConfig)
      .catch(() => {});
    (async () => {
      try {
        const saved = await tokenStore.get();
        if (saved) {
          const { account } = await makeApi(saved, () => {}).account();
          setToken(saved);
          setAccount(account);
        }
      } catch {
        await tokenStore.clear().catch(() => {});
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const begin = useCallback(async (res: { token: string; account: AdvertiserAccount }) => {
    await tokenStore.set(res.token);
    setToken(res.token);
    setAccount(res.account);
  }, []);

  const value = useMemo<Session>(
    () => ({
      ready,
      account,
      config,
      api,
      signIn: async (email, password) =>
        begin(await request("/advertisers/login", { method: "POST", body: JSON.stringify({ email, password }) })),
      signUp: async (input) => begin(await request("/advertisers/signup", { method: "POST", body: JSON.stringify(input) })),
      signOut: async () => {
        if (token) {
          // Revoke server-side too; sign out locally even if that fails.
          await request("/advertisers/me/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(
            () => {},
          );
        }
        await clear();
      },
      refreshAccount: async () => setAccount((await api.account()).account),
      replaceToken: async (t) => {
        await tokenStore.set(t);
        setToken(t);
      },
    }),
    [ready, account, config, api, token, begin, clear],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAdvertiser() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useAdvertiser must be used inside AdvertiserProvider");
  return ctx;
}

/** For screens behind sign-in: redirects to the login screen once we know there's no session. */
export function useRequireAdvertiser() {
  const session = useAdvertiser();
  useEffect(() => {
    if (session.ready && !session.account) router.replace("/advertiser/login");
  }, [session.ready, session.account]);
  return session;
}

export function formatCents(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
