import { api } from './api';

export async function loginRequest(email, password) {
  return api.post('/api/auth/login', { email, password });
}

export async function logoutRequest() {
  return api.post('/api/auth/logout');
}

export async function fetchMe() {
  const resp = await api.get('/api/auth/me');
  return resp.data;
}
