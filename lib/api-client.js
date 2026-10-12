'use client';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data || {};
  }
}

const NO_REDIRECT = ['/api/auth/login', '/api/auth/signup', '/api/setup', '/api/attend'];

export async function api(path, { method = 'GET', body, form } = {}) {
  const options = { method, headers: {}, credentials: 'same-origin', cache: 'no-store' };
  if (form) {
    options.body = form;
  } else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new ApiError('Network problem. Check your internet connection and try again.', 0);
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }

  if (res.status === 401 && typeof window !== 'undefined' && !NO_REDIRECT.some((p) => path.startsWith(p))) {
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status}).`, res.status, data);
  return data;
}

export function safeStorage() {
  try {
    const s = window.localStorage;
    return {
      get: (k) => {
        try {
          return s.getItem(k);
        } catch {
          return null;
        }
      },
      set: (k, v) => {
        try {
          s.setItem(k, v);
        } catch {
          /* ignore */
        }
      },
    };
  } catch {
    return { get: () => null, set: () => {} };
  }
}
