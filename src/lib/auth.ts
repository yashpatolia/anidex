import NextAuth from "next-auth";
import type { OAuthConfig } from "next-auth/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { generateUniqueUsername } from "@/lib/username";
import { importInitialAnilistList } from "@/lib/anilist-sync";

// AniList profile, from the Viewer query in the custom userinfo request
// below — not a built-in Auth.js provider, so this whole config is custom.
type AnilistProfile = {
  id: number;
  name: string;
  avatar: { large: string | null } | null;
};

// @auth/core's own TokenEndpointHandler/UserinfoEndpointHandler types
// reference an `EndpointHandler` generic that isn't actually defined or
// exported anywhere in the installed package (confirmed by grepping its
// .d.ts files) — a real gap in that beta package's types, not something
// fixable from here. Minimal local types for exactly the shape used below,
// instead of fighting a type that doesn't resolve.
type AnilistTokenRequestArgs = {
  params: { code?: string };
  provider: { token?: { url?: string }; clientId?: string; clientSecret?: string; callbackUrl: string };
};
type AnilistUserinfoRequestArgs = { tokens: { access_token?: string } };

async function anilistTokenRequest({ params, provider }: AnilistTokenRequestArgs) {
  const res = await fetch(provider.token?.url as string, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      redirect_uri: provider.callbackUrl,
      code: params.code,
    }),
  });
  const tokens = await res.json();
  if (!res.ok) throw new Error(`AniList token exchange failed: ${JSON.stringify(tokens)}`);
  return { tokens };
}

async function anilistUserinfoRequest({ tokens }: AnilistUserinfoRequestArgs) {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${tokens.access_token}`,
    },
    body: JSON.stringify({ query: `query { Viewer { id name avatar { large } } }` }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(`AniList Viewer query failed: ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.data.Viewer;
}

// AniList isn't one of Auth.js's built-in providers, and its OAuth2
// implementation has two real deviations from the library's defaults that
// forced a fully custom config instead of the usual few-line wrapper:
//   - Token exchange wants a JSON body (docs.anilist.co/guide/auth/
//     authorization-code), not the standard x-www-form-urlencoded Auth.js
//     sends by default.
//   - There's no REST /userinfo endpoint — user identity comes from a
//     GraphQL Viewer query against the same API this app already talks to
//     for catalog data, authenticated with the just-issued access token.
// Also per docs.anilist.co/guide/auth/: scopes aren't supported at all
// (omitted below, not just left at Auth.js's default), and access tokens
// are valid for 1 year with no refresh token — see anilist-sync.ts's
// getAccessToken for what happens once one expires (nothing automatic;
// the user just needs to sign in again).
const AniList: OAuthConfig<AnilistProfile> = {
  id: "anilist",
  name: "AniList",
  type: "oauth",
  clientId: process.env.ANILIST_CLIENT_ID,
  clientSecret: process.env.ANILIST_CLIENT_SECRET,
  authorization: {
    url: "https://anilist.co/api/v2/oauth/authorize",
    // scope: "" (not omitted) is load-bearing — @auth/core's
    // normalizeOAuth unconditionally injects "openid profile email" onto
    // ANY OAuth provider's authorization params when no scope key is
    // present at all, regardless of provider type ("oauth" vs "oidc").
    // AniList's own docs say scopes aren't supported, and it turns out
    // that's enforced, not just unused: sending that default openid scope
    // made AniList's authorize endpoint reject the request outright with
    // invalid_scope, before ever showing a login page (confirmed live —
    // this exact bug is what broke the first end-to-end login attempt).
    params: { response_type: "code", scope: "" },
  },
  checks: ["state"],
  token: { url: "https://anilist.co/api/v2/oauth/token", request: anilistTokenRequest },
  userinfo: { url: "https://graphql.anilist.co", request: anilistUserinfoRequest },
  profile(profile) {
    return {
      id: String(profile.id),
      name: profile.name,
      // AniList's API doesn't expose the user's email at all — every
      // AniList-linked account has a null email in our own User table.
      // Fine for sign-in (Auth.js identifies the account by
      // provider+providerAccountId, not email), but anything in this app
      // that assumed every user has an email (password-reset flows,
      // notification-by-email — neither exists today, but worth knowing).
      email: null,
      image: profile.avatar?.large ?? null,
    };
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Self-hosted behind nginx: Auth.js only trusts the incoming Host header
  // when this is set (Vercel gets it for free; we don't).
  trustHost: true,
  // Kept explicit (was originally required because Credentials needs JWT
  // sessions, which no longer exists) — the jwt/session callbacks below are
  // written for JWT's { token } shape, not database strategy's { user }
  // shape, and switching strategies without updating both together would
  // silently break session.user.id on every request.
  session: { strategy: "jwt" },
  providers: [AniList],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) session.user.id = token.id as string;
      return session;
    },
  },
  events: {
    // Fires when the adapter creates a brand-new User row — i.e. every
    // first-time AniList sign-in, since that's the only provider now.
    // Every account needs a username, and AniList's own username isn't
    // guaranteed unique in our namespace (or even valid — see
    // generateUniqueUsername's own char-set rules), so generate one from
    // it; the user can rename it any time from Account settings
    // (usernameAutoAssigned drives the nudge to do so there).
    async createUser({ user }) {
      if (!user.id) return;
      const seed = user.name ?? "user";
      const username = await generateUniqueUsername(prisma, seed);
      await prisma.user.update({
        where: { id: user.id },
        data: { username, usernameAutoAssigned: true },
      });
    },
    // isNewUser is only true on the sign-in that triggered createUser
    // above (same underlying event, different data available on each —
    // createUser doesn't get account/profile, this one does) — see
    // anilist-sync.ts's importInitialAnilistList for why this is the hook
    // for a one-time pull of the user's existing AniList list.
    async signIn({ user, account, isNewUser }) {
      if (!isNewUser || !user.id || account?.provider !== "anilist" || !user.name) return;
      await importInitialAnilistList(user.id, user.name);
    },
  },
});
