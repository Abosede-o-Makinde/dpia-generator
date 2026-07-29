'use client';

/**
 * Thin fetch wrapper for the Shieldwise API. Handles auth headers, the active
 * organisation header, and access-token refresh-on-401 (single retry).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: unknown }).message)
        : `API error ${status}`,
    );
  }
}

function getTokens() {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem('shieldwise_access_token'),
    refreshToken: localStorage.getItem('shieldwise_refresh_token'),
  };
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('shieldwise_access_token', accessToken);
  localStorage.setItem('shieldwise_refresh_token', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('shieldwise_access_token');
  localStorage.removeItem('shieldwise_refresh_token');
}

export function getActiveOrgId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('shieldwise_active_org');
}

export function setActiveOrgId(orgId: string) {
  localStorage.setItem('shieldwise_active_org', orgId);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  skipOrgHeader?: boolean;
  /** Set for binary responses (report downloads). */
  raw?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getTokens();
  if (!refreshToken) return null;
  const res = await fetch(`${API_URL}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipOrgHeader, raw } = options;
  const doFetch = async (): Promise<Response> => {
    const { accessToken } = getTokens();
    const orgId = getActiveOrgId();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (orgId && !skipOrgHeader) headers['X-Organisation-Id'] = orgId;

    return fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res = await doFetch();
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) res = await doFetch();
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, errBody);
  }
  if (res.status === 204) return undefined as T;
  if (raw) return (await res.blob()) as T;
  return (await res.json()) as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const { accessToken } = getTokens();
  const orgId = getActiveOrgId();
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (orgId) headers['X-Organisation-Id'] = orgId;

  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body: formData });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, errBody);
  }
  return (await res.json()) as T;
}

export { API_URL };
