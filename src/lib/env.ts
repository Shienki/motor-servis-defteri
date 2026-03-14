export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  localFallbackEnabled: import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOCAL_FALLBACK === "true"
};

export const integrationStatus = {
  supabaseReady: Boolean(env.supabaseUrl && env.supabaseAnonKey),
  localFallbackEnabled: env.localFallbackEnabled
};
