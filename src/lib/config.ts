/** Which required environment variables are missing (shown on screen instead of a bare 500). */
export function missingEnv(): string[] {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  return required.filter((k) => !process.env[k]);
}
