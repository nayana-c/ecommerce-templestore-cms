/**
 * Typed API client for ecommerce-api with bearer-token auth.
 *
 * Phase 2 uses bearer access tokens held by the SPA plus a rotating refresh
 * token; on a 401 the client transparently refreshes once and retries. (The
 * production hardening — httpOnly cookies + CSRF behind a single domain — is a
 * deployment change that keeps this same surface.)
 */
import type { PublicStoreConfig } from '@ecommerce/domain';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const ACCESS_KEY = 'ecom.cms.accessToken';
const REFRESH_KEY = 'ecom.cms.refreshToken';

export type Role = 'admin' | 'manager' | 'editor' | 'viewer';
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  status: 'active' | 'disabled';
}
interface Tokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
interface AuthResult {
  user: AuthUser;
  tokens: Tokens;
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: { requestId: string };
}
interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string };
  meta: { requestId: string };
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- token storage (resilient to disabled/unavailable storage) ---
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
let accessToken: string | null = read(ACCESS_KEY);

function setTokens(tokens: Tokens): void {
  accessToken = tokens.accessToken;
  try {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  } catch {
    /* ignore */
  }
}
function clearTokens(): void {
  accessToken = null;
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}
export function hasSession(): boolean {
  return read(REFRESH_KEY) !== null;
}

function unwrap<T>(body: SuccessEnvelope<T> | ErrorEnvelope | T, ok: boolean, status: number): T {
  if (body && typeof body === 'object' && 'success' in body) {
    if (body.success) return (body as SuccessEnvelope<T>).data;
    const e = body as ErrorEnvelope;
    throw new ApiError(e.error.code, e.error.message);
  }
  if (!ok) throw new ApiError('HTTP_ERROR', `Request failed (${status})`);
  return body as T;
}

let refreshInFlight: Promise<boolean> | null = null;
async function refreshTokens(): Promise<boolean> {
  const refreshToken = read(REFRESH_KEY);
  if (!refreshToken) return false;
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearTokens();
        return false;
      }
      const data = unwrap<AuthResult>(await res.json(), res.ok, res.status);
      setTokens(data.tokens);
      return true;
    } catch {
      clearTokens();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const send = (): Promise<Response> =>
    fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(auth && accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await send();
  if (res.status === 401 && auth && hasSession()) {
    if (await refreshTokens()) res = await send();
  }
  return unwrap<T>(await res.json(), res.ok, res.status);
}

export const api = {
  async login(email: string, password: string): Promise<AuthUser> {
    const result = await request<AuthResult>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    setTokens(result.tokens);
    return result.user;
  },

  async registerFirstAdmin(email: string, password: string, name: string): Promise<AuthUser> {
    const result = await request<AuthResult>('/api/v1/auth/register', {
      method: 'POST',
      body: { email, password, name },
      auth: false,
    });
    setTokens(result.tokens);
    return result.user;
  },

  async me(): Promise<AuthUser> {
    const { user } = await request<{ user: AuthUser }>('/api/v1/auth/me');
    return user;
  },

  async logout(): Promise<void> {
    const refreshToken = read(REFRESH_KEY);
    try {
      if (refreshToken) {
        await request('/api/v1/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          auth: false,
        });
      }
    } finally {
      clearTokens();
    }
  },

  getStoreConfig(): Promise<PublicStoreConfig> {
    return request<PublicStoreConfig>('/api/v1/store/config', { auth: false });
  },

  categories: {
    list(): Promise<AdminCategory[]> {
      return request<AdminCategory[]>('/api/v1/admin/categories');
    },
    create(input: CategoryInput): Promise<AdminCategory> {
      return request<AdminCategory>('/api/v1/admin/categories', { method: 'POST', body: input });
    },
    update(id: string, input: CategoryInput): Promise<AdminCategory> {
      return request<AdminCategory>(`/api/v1/admin/categories/${id}`, { method: 'PATCH', body: input });
    },
    remove(id: string): Promise<{ ok: boolean }> {
      return request<{ ok: boolean }>(`/api/v1/admin/categories/${id}`, { method: 'DELETE' });
    },
  },

  products: {
    list(
      params: { status?: string; category?: string; q?: string; cursor?: string; limit?: number } = {},
    ): Promise<Page<AdminProduct>> {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
      }
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      return request<Page<AdminProduct>>(`/api/v1/admin/products${suffix}`);
    },
    create(input: ProductInput): Promise<AdminProduct> {
      return request<AdminProduct>('/api/v1/admin/products', { method: 'POST', body: input });
    },
    update(id: string, input: ProductInput): Promise<AdminProduct> {
      return request<AdminProduct>(`/api/v1/admin/products/${id}`, { method: 'PATCH', body: input });
    },
    remove(id: string): Promise<{ ok: boolean }> {
      return request<{ ok: boolean }>(`/api/v1/admin/products/${id}`, { method: 'DELETE' });
    },
  },
};

// --- Catalog types (mirror the API admin projections) ---
export interface Money {
  amountMinor: number;
  currency: string;
}
export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  status: 'active' | 'hidden';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
export interface CategoryInput {
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  status?: 'active' | 'hidden';
  sortOrder?: number;
}
export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  productType: 'physical' | 'service';
  status: 'draft' | 'active' | 'archived';
  categoryIds: string[];
  price: Money;
  compareAtPrice: Money | null;
  images: string[];
  attributes: Record<string, string>;
  sku: string | null;
  stockQuantity: number | null;
  createdAt: string;
  updatedAt: string;
}
export interface ProductInput {
  name: string;
  slug: string;
  description?: string;
  productType?: 'physical' | 'service';
  status?: 'draft' | 'active' | 'archived';
  categoryIds?: string[];
  priceMinor: number;
  currency?: string;
  compareAtPriceMinor?: number | null;
  sku?: string | null;
  stockQuantity?: number | null;
  images?: string[];
  attributes?: Record<string, string>;
}
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
