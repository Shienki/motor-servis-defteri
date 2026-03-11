import { createClient } from "@supabase/supabase-js";

export function getSupabaseAnonClient(authToken?: string) {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase ortam değişkenleri eksik.");
  }

  return createClient(url, anonKey, {
    global: authToken
      ? {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function getSupabaseServiceClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY tanımlı değil.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function requireAuthenticatedUser(req: any) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return { token: "", user: null };
  }

  const client = getSupabaseAnonClient(token);
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) {
    return { token, user: null };
  }

  return { token, user: data.user };
}
