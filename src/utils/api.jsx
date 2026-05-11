import axios from 'axios';
import { getCsrfToken } from './csrf';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5174';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = getCsrfToken();
    if (token) config.headers['X-CSRF-Token'] = token;
  }
  return config;
});

// apiFetch is a drop-in replacement for fetch() that ensures credentials are
// included AND the CSRF token header is attached on mutating methods. Use it
// for any call to our backend that can't easily migrate to the axios `api`
// instance (e.g. existing fetch-based code paths).
export async function apiFetch(url, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  const headers = new Headers(opts.headers || {});
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = getCsrfToken();
    if (token && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', token);
    }
  }
  return fetch(url, { credentials: 'include', ...opts, headers });
}

let refreshInFlight = null;
let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (resp) => resp,
  async (error) => {
    const { response, config } = error;
    if (!response || !config) return Promise.reject(error);

    const wwwAuth = response.headers['www-authenticate'] || '';
    const isExpired = response.status === 401 && wwwAuth.includes('token_expired');

    if (isExpired && !config.__retried) {
      config.__retried = true;
      try {
        refreshInFlight = refreshInFlight || api.post('/api/auth/refresh');
        await refreshInFlight;
        refreshInFlight = null;
        return api(config);
      } catch (e) {
        refreshInFlight = null;
        onUnauthorized();
        return Promise.reject(e);
      }
    }

    if (response.status === 401 || response.status === 403 || response.status === 423) {
      if (!config.url?.endsWith('/api/auth/me') && !config.url?.endsWith('/api/auth/login')) {
        onUnauthorized();
      }
    }
    return Promise.reject(error);
  }
);
