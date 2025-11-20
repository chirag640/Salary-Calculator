import { type NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import {
  exchangeCodeForTokens,
  getUserProfile,
  refreshAccessToken,
} from "@/lib/auth/google";
import { connectToDatabase } from "@/lib/mongodb";
import { generateToken, verifyToken } from "@/lib/auth";
import { verifyOAuthState } from "@/lib/validation/auth";
import { encrypt } from "@/lib/encryption";
import { ObjectId } from "mongodb";
import { updateIntegrationTokens, getIntegration } from "@/lib/integrations/db";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000";

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/login?error=missing_code`);
    }

    // Verify and parse state
    const stateData = state ? verifyOAuthState(state) : null;
    if (!stateData) {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`);
    }

    const returnTo = stateData.returnTo || "/";

    // Exchange code for tokens (ensure redirectUri matches the one used when generating state)
    const authRedirect =
      process.env.GOOGLE_AUTH_REDIRECT_URI ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;
    const tokens = await exchangeCodeForTokens(code, authRedirect);

    // Get user profile from Google
    const profile = await getUserProfile(tokens.accessToken);

    const { db } = await connectToDatabase();

    // Try to find existing user by Google ID first
    let user = await db.collection("users").findOne({ googleId: profile.id });

    if (!user) {
      // Try to find by email
      user = await db.collection("users").findOne({ email: profile.email });

      if (user) {
        // User exists with this email but no Google account linked
        // Check if this is an account linking flow (user already authenticated)
        const authToken = request.cookies.get("auth-token")?.value;

        if (authToken) {
          // Determine which user the current session belongs to. Only auto-link
          // if the session user matches the account we found by email. This
          // prevents accidentally linking a Google account to whichever user is
          // currently signed in (e.g. during testing or when switching accounts).
          const sessionUser = verifyToken(authToken);

          if (sessionUser && sessionUser._id === user._id.toString()) {
            // Same user is signed in; proceed to link
            await db.collection("users").updateOne(
              { _id: user._id },
              {
                $set: {
                  googleId: profile.id,
                  isVerified: true, // Mark as verified since Google verified the email
                  updatedAt: new Date(),
                },
              }
            );

            // Store OAuth integration (used for auth token refresh and account linking)
            const accessTokenEncrypted = tokens.accessToken
              ? encrypt(tokens.accessToken)
              : undefined;
            const refreshTokenEncrypted = tokens.refreshToken
              ? encrypt(tokens.refreshToken)
              : undefined;
            const oauthScopes = ["openid", "profile", "email"];

            await db.collection("oauth_integrations").updateOne(
              { userId: user._id.toString(), provider: "google" },
              {
                $set: {
                  userId: user._id.toString(),
                  provider: "google",
                  providerId: profile.id,
                  email: profile.email,
                  accessToken: accessTokenEncrypted,
                  refreshToken: refreshTokenEncrypted,
                  tokenExpiry: tokens.expiryDate
                    ? new Date(tokens.expiryDate)
                    : undefined,
                  scopes: oauthScopes,
                  updatedAt: new Date(),
                },
                $setOnInsert: {
                  createdAt: new Date(),
                },
              },
              { upsert: true }
            );

            // Redirect with success message after linking
            return NextResponse.redirect(`${baseUrl}${returnTo}?linked=google`);
          } else {
            // Session belongs to a different user. This is a safety check to prevent
            // accidentally linking a Google account to the wrong user account.
            // Solution: Send user to link-account page with proper context
            console.warn(
              "OAuth callback: session user does not match account found by email; redirecting to link-account page."
            );

            const linkToken = Buffer.from(
              JSON.stringify({
                email: profile.email,
                googleId: profile.id,
                name: profile.name,
                timestamp: Date.now(),
                existingUserId: user._id.toString(),
              })
            ).toString("base64");

            return NextResponse.redirect(
              `${baseUrl}/link-account?token=${encodeURIComponent(
                linkToken
              )}&returnTo=${encodeURIComponent(returnTo)}&error=different_user`
            );
          }
        } else {
          // User not logged in - need to verify they own this account before linking
          // Redirect to account linking page
          const linkToken = Buffer.from(
            JSON.stringify({
              email: profile.email,
              googleId: profile.id,
              name: profile.name,
              timestamp: Date.now(),
            })
          ).toString("base64");

          return NextResponse.redirect(
            `${baseUrl}/link-account?token=${encodeURIComponent(
              linkToken
            )}&returnTo=${encodeURIComponent(returnTo)}`
          );
        }
      } else {
        // No user with this email - create new account
        const now = new Date();
        const result = await db.collection("users").insertOne({
          name: profile.name || profile.email.split("@")[0],
          email: profile.email,
          password: undefined, // OAuth-only user (no password)
          googleId: profile.id,
          isVerified: true, // Google verified the email
          createdAt: now,
          updatedAt: now,
        });

        user = await db.collection("users").findOne({ _id: result.insertedId });

        // Store OAuth integration for auth and account linking
        if (user) {
          const accessTokenEncrypted = tokens.accessToken
            ? encrypt(tokens.accessToken)
            : undefined;
          const refreshTokenEncrypted = tokens.refreshToken
            ? encrypt(tokens.refreshToken)
            : undefined;
          const oauthScopes = ["openid", "profile", "email"];

          await db.collection("oauth_integrations").insertOne({
            userId: user._id.toString(),
            provider: "google",
            providerId: profile.id,
            email: profile.email,
            accessToken: accessTokenEncrypted,
            refreshToken: refreshTokenEncrypted,
            tokenExpiry: tokens.expiryDate
              ? new Date(tokens.expiryDate)
              : undefined,
            scopes: oauthScopes,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    } else {
      // User found by Google ID - update OAuth tokens
      const accessTokenEncrypted = tokens.accessToken
        ? encrypt(tokens.accessToken)
        : undefined;
      const refreshTokenEncrypted = tokens.refreshToken
        ? encrypt(tokens.refreshToken)
        : undefined;
      const oauthScopes = ["openid", "profile", "email"];

      await db.collection("oauth_integrations").updateOne(
        { userId: user._id.toString(), provider: "google" },
        {
          $set: {
            accessToken: accessTokenEncrypted,
            refreshToken: refreshTokenEncrypted,
            tokenExpiry: tokens.expiryDate
              ? new Date(tokens.expiryDate)
              : undefined,
            scopes: oauthScopes,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    if (!user) {
      console.error("Google auth: user still missing after create");
      return NextResponse.redirect(`${baseUrl}/login?error=oauth_user_missing`);
    }

    // Note: Calendar integration auto-creation and token refresh have been removed.
    // OAuth tokens are stored in oauth_integrations for auth/session purposes only.

    // Generate JWT and set cookie
    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      isVerified: user.isVerified,
    });

    const response = NextResponse.redirect(`${baseUrl}${returnTo}`);
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Required for OAuth redirects
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Google auth callback error:", err);
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}/login?error=oauth_failure`);
  }
}
