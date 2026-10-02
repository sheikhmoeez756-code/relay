// On Vercel, derive the app's public URL from the production domain when NEXTAUTH_URL isn't set.
// Imported before anything reads NEXTAUTH_URL (NextAuth, origin checks, email links).
if (!process.env.NEXTAUTH_URL && process.env.VERCEL_PROJECT_PRODUCTION_URL)
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;

export {};
