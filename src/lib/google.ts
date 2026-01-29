import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { decryptToken, encryptToken } from "./token";
import { NextRequest } from "next/server";

const scopes = [
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/script.deployments.readonly",
  "https://www.googleapis.com/auth/script.projects.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getOAuthClient(redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildAuthUrl(redirectUri: string, state?: string) {
  const client = getOAuthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    state,
  });
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{ refresh_token?: string; access_token?: string }> {
  const client = getOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  return {
    refresh_token: tokens.refresh_token ?? undefined,
    access_token: tokens.access_token ?? undefined,
  };
}

export const TOKEN_COOKIE = "gs_tokens";

export async function sealTokens(tokens: object) {
  const sealed = await encryptToken(tokens);
  return sealed;
}

export function getRedirectUriFromRequest(req?: NextRequest) {
  const origin =
    req?.headers.get("origin") ||
    process.env.APP_ORIGIN ||
    "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}/api/google/callback`;
}

export async function loadTokensFromSerialized(
  raw?: string,
): Promise<OAuth2Client | null> {
  if (!raw) return null;
  const tokens = await decryptToken(raw);
  if (!tokens) return null;
  const client = getOAuthClient(getRedirectUriFromRequest());
  client.setCredentials(tokens);
  return client;
}

export async function listAppsScripts(auth: OAuth2Client) {
  const drive = google.drive({ version: "v3", auth });
  const script = google.script({ version: "v1", auth });

  const filesRes = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.script' and 'me' in owners and trashed = false",
    fields: "files(id,name,owners(emailAddress,displayName),modifiedTime,createdTime)",
    pageSize: 50,
  });

  const files = filesRes.data.files || [];

  const results = await Promise.all(
    files.map(async (file) => {
      const deployments = await script.projects.deployments
        .list({
          scriptId: file.id!,
        })
        .then((res) => res.data.deployments || [])
        .catch(() => []);

      return {
        id: file.id!,
        name: file.name || "Untitled script",
        owner:
          file.owners?.map((o) => o.displayName || o.emailAddress).join(", ") ||
          "Unknown",
        createdAt: file.createdTime,
        updatedAt: file.modifiedTime,
        deployments: deployments.map((d) => ({
          deploymentId: d.deploymentId,
          version: d.deploymentConfig?.versionNumber,
          description: d.deploymentConfig?.description,
          updateTime: d.updateTime,
        })),
      };
    }),
  );

  return results;
}
