// ============================================
// API Client — single source of truth for all
// HTTP requests to the 5Rivers backend.
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function friendlyMessage(status: number): string {
  switch (status) {
    case 400: return 'Invalid request. Please check your input and try again.';
    case 403: return 'You do not have permission to perform this action.';
    case 404: return 'The requested resource was not found.';
    case 409: return 'This operation conflicts with existing data.';
    case 413: return 'The file is too large. Please try a smaller file.';
    case 422: return 'The data provided is invalid. Please review and try again.';
    case 429: return 'Too many requests. Please wait a moment and try again.';
    case 502:
    case 503:
    case 504: return 'The server is currently unavailable. Please try again shortly.';
    default:
      if (status >= 500) return 'Something went wrong on the server. Please try again.';
      return `Request failed (${status})`;
  }
}

/**
 * Core request function. All API calls go through here.
 * Automatically attaches JWT token and handles errors.
 */
export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = localStorage.getItem('token');

  const headers: HeadersInit = {
    ...(options?.body instanceof FormData
      ? {} // Let browser set Content-Type for multipart
      : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers ?? {}),
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(0, 'Unable to connect to the server. Please check your internet connection and try again.');
  }

  // Auto-logout on 401
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  if (!res.ok) {
    let message = friendlyMessage(res.status);
    try {
      const body = await res.json();
      // Server returns { error: { code, message } }
      const serverMsg = body?.error?.message || body?.error || body?.message;
      if (typeof serverMsg === 'string' && serverMsg.length > 0) {
        message = serverMsg;
      }
    } catch {
      // response body wasn't JSON — use friendly default
    }
    throw new ApiError(res.status, message);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// --- Convenience methods ---

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),

  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) =>
    apiRequest<T>(path, { method: 'DELETE' }),

  upload: <T>(path: string, formData: FormData) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: formData,
    }),
};
