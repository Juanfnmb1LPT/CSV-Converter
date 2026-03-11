const AUTH_STORAGE_KEY = 'csv_converter_auth';

const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'test';

export function getStoredAuth() {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (parsed?.username === VALID_USERNAME && parsed?.isAuthenticated === true) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getStoredAuth());
}

export function loginWithCredentials(username, password) {
  const normalizedUsername = String(username || '').trim();
  const normalizedPassword = String(password || '');

  if (normalizedUsername !== VALID_USERNAME || normalizedPassword !== VALID_PASSWORD) {
    return false;
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      username: VALID_USERNAME,
      isAuthenticated: true,
      loggedInAt: Date.now(),
    })
  );

  return true;
}

export function logout() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
