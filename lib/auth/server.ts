import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

/** Do not advertise a working login until both branch URL and cookie key are configured. */
let cached: ReturnType<typeof createNeonAuth> | undefined;
export function getAuthServer() {
  if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET ||
      process.env.NEON_AUTH_COOKIE_SECRET.length < 32) return null;
  cached ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET },
  });
  return cached;
}
export async function getAuthenticatedUser() {
  const server = getAuthServer();
  if (!server) return null;
  try {
    const { data } = await server.getSession();
    if (!data?.user?.id) return null;
    return { id: data.user.id, email: data.user.email, name: data.user.name,
      emailVerified: Boolean(data.user.emailVerified) };
  } catch {
    return null;
  }
}

export type Identity = NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>;

export function isPlatformAdmin(user: Identity) {
  const allowed = (process.env.PLATFORM_ADMIN_USER_IDS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  return user.emailVerified && allowed.includes(user.id);
}
