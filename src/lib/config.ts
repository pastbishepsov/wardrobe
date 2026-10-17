/** Which required environment variables are missing (shown on screen instead of a bare 500). */
export function missingEnv(): string[] {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  if (process.env.NODE_ENV === "production") required.push("APP_PASSWORD");
  return required.filter((k) => !process.env[k]);
}
