const AUTH_STORAGE_KEY = 'csv_converter_auth';
import { hasSupabaseConfig, supabase } from './supabase';

export function getStoredAuth() {
    try {
        const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (parsed?.isAuthenticated === true && typeof parsed?.username === 'string' && parsed.username.length > 0) {
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

export async function loginWithCredentials(username, password) {
    const normalizedUsername = String(username || '').trim();
    const normalizedPassword = String(password || '');

    if (!normalizedUsername || !normalizedPassword) {
        return { ok: false, error: 'Username and password are required.' };
    }

    if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: 'Login is not configured. Missing Supabase settings.' };
    }

    const { data, error } = await supabase
        .from('users')
        .select('id,username')
        .eq('username', normalizedUsername)
        .eq('password', normalizedPassword)
        .maybeSingle();

    if (error) {
        return { ok: false, error: `Login failed: ${error.message}` };
    }

    if (!data) {
        return { ok: false, error: 'Invalid username or password.' };
    }

    window.localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
            userId: data.id,
            username: data.username,
            isAuthenticated: true,
            loggedInAt: Date.now(),
        })
    );

    return { ok: true };
}

export function logout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
