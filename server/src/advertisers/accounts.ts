import { randomBytes } from "node:crypto";
import { hashPassword, hashToken, newSessionToken, verifyPassword } from "../auth.js";
import { JsonStore } from "../store.js";

export interface SavedCard {
  paymentMethodId: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface AdvertiserAccount {
  id: string;
  email: string;
  passwordHash: string;
  companyName: string;
  contactName: string;
  website: string | null;
  termsVersion: string;
  termsAcceptedAt: string;
  stripeCustomerId: string | null;
  card: SavedCard | null;
  createdAt: string;
}

export type PublicAdvertiser = Omit<AdvertiserAccount, "passwordHash" | "stripeCustomerId">;

interface Session {
  tokenHash: string;
  accountId: string;
  expiresAt: string;
}

const SESSION_DAYS = 30;
const accounts = new JsonStore<AdvertiserAccount[]>("advertisers.json", () => []);
const sessions = new JsonStore<Session[]>("advertiser-sessions.json", () => []);

// Used so a login for an unknown email takes as long as one for a real account.
const DUMMY_HASH = hashPassword("timing-equalizer");

export const toPublicAdvertiser = ({ passwordHash: _p, stripeCustomerId: _s, ...a }: AdvertiserAccount): PublicAdvertiser => a;

export async function findByEmail(email: string) {
  const e = email.trim().toLowerCase();
  return (await accounts.read()).find((a) => a.email === e) ?? null;
}

export async function getAccount(id: string) {
  return (await accounts.read()).find((a) => a.id === id) ?? null;
}

export async function createAccount(input: {
  email: string;
  password: string;
  companyName: string;
  contactName: string;
  website: string | null;
  termsVersion: string;
}): Promise<AdvertiserAccount> {
  const account: AdvertiserAccount = {
    id: `adv_${randomBytes(6).toString("hex")}`,
    email: input.email.trim().toLowerCase(),
    passwordHash: await hashPassword(input.password),
    companyName: input.companyName,
    contactName: input.contactName,
    website: input.website,
    termsVersion: input.termsVersion,
    termsAcceptedAt: new Date().toISOString(),
    stripeCustomerId: null,
    card: null,
    createdAt: new Date().toISOString(),
  };
  await accounts.update((all) => void all.push(account));
  return account;
}

export async function updateAccount(id: string, fn: (a: AdvertiserAccount) => void) {
  return accounts.update((all) => {
    const a = all.find((x) => x.id === id);
    if (a) fn(a);
    return a ?? null;
  });
}

export async function checkCredentials(email: string, password: string): Promise<AdvertiserAccount | null> {
  const account = await findByEmail(email);
  const ok = await verifyPassword(password, account?.passwordHash ?? (await DUMMY_HASH));
  return account && ok ? account : null;
}

export async function startSession(accountId: string): Promise<string> {
  const { token, tokenHash } = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  const now = new Date().toISOString();
  await sessions.update((all) => {
    const live = all.filter((s) => s.expiresAt > now); // prune while we're here
    all.length = 0;
    all.push(...live, { tokenHash, accountId, expiresAt });
  });
  return token;
}

export async function accountForToken(token: string | undefined): Promise<AdvertiserAccount | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = (await sessions.read()).find((s) => s.tokenHash === tokenHash);
  if (!session || session.expiresAt < new Date().toISOString()) return null;
  return getAccount(session.accountId);
}

export async function endSession(token: string) {
  const tokenHash = hashToken(token);
  await sessions.update((all) => {
    const i = all.findIndex((s) => s.tokenHash === tokenHash);
    if (i >= 0) all.splice(i, 1);
  });
}

export async function endAllSessions(accountId: string) {
  await sessions.update((all) => {
    const keep = all.filter((s) => s.accountId !== accountId);
    all.length = 0;
    all.push(...keep);
  });
}
