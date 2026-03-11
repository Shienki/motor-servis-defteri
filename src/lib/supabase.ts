import { createClient } from "@supabase/supabase-js";
import { env, integrationStatus } from "./env";

export const supabase = integrationStatus.supabaseReady
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

export async function getAccessToken() {
  if (!supabase) {
    return "";
  }

  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}
