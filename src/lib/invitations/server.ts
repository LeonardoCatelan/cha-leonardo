import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
} from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

const codeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const invitationCodePattern = /^[A-HJ-KM-NP-Z2-9]{8}$/;
const sessionDurationSeconds = 60 * 60 * 24 * 180;
const adminInvitationName = "Leonardo";
const adminCodeTakenMessage =
  "O valor de GIFT_ADMIN_CODE já pertence ao convite de um convidado. Escolha outro código.";

export const invitationSessionCookie = "vf-invitation-session";

export type InvitationAudience = "amigos" | "familia";

export type InvitationSession = {
  invitation: {
    audience: InvitationAudience;
    displayName: string;
    id: string;
    isAdmin: boolean;
    sessionVersion: number;
  };
  sessionId: string;
};

function getInvitationSecret() {
  const secret = process.env.INVITATION_CODE_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error(
      "INVITATION_CODE_SECRET deve ter pelo menos 32 caracteres.",
    );
  }

  return secret;
}

function encryptionKey() {
  return createHash("sha256")
    .update(`gift-invitation-encryption:${getInvitationSecret()}`)
    .digest();
}

export function normalizeInvitationCode(value: unknown) {
  if (typeof value !== "string") return null;

  const normalized = value
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .trim();

  return invitationCodePattern.test(normalized) ? normalized : null;
}

export function formatInvitationCode(value: string) {
  const normalized = normalizeInvitationCode(value);
  return normalized
    ? `${normalized.slice(0, 4)}-${normalized.slice(4)}`
    : "";
}

export function generateInvitationCode() {
  return Array.from(
    { length: 8 },
    () => codeAlphabet[randomInt(codeAlphabet.length)],
  ).join("");
}

export function hashInvitationCode(code: string) {
  return createHmac("sha256", getInvitationSecret())
    .update(`gift-invitation-code:${code}`)
    .digest("hex");
}

export function encryptInvitationCode(code: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(code, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv, tag, ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptInvitationCode(payload: string) {
  const [ivValue, tagValue, ciphertextValue] = payload.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Código criptografado inválido.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function getAdminInvitationCode() {
  const code = normalizeInvitationCode(process.env.GIFT_ADMIN_CODE);

  if (!code) {
    throw new Error(
      `GIFT_ADMIN_CODE deve ser um código de convite de oito caracteres do alfabeto ${codeAlphabet}.`,
    );
  }

  return code;
}

/**
 * Mantém a linha administrativa em sincronia com GIFT_ADMIN_CODE. Serve tanto
 * de bootstrap, na primeira execução, quanto de rotação: trocar a variável
 * troca o código e revoga as sessões administrativas anteriores.
 */
export async function ensureAdminInvitation() {
  const code = getAdminInvitationCode();
  const codeHash = hashInvitationCode(code);
  const supabase = createSupabaseAdminClient();

  const { data: existing, error: readError } = await supabase
    .from("gift_invitations")
    .select("id,code_hash")
    .eq("is_admin", true)
    .maybeSingle();

  if (readError) throw readError;
  if (existing?.code_hash === codeHash) return;

  const codeRecord = {
    code_ciphertext: encryptInvitationCode(code),
    code_hash: codeHash,
    code_hint: code.slice(-4),
  };

  if (!existing) {
    const { error } = await supabase.from("gift_invitations").insert({
      ...codeRecord,
      audience: "familia",
      display_name: adminInvitationName,
      is_admin: true,
    });

    // Dois acessos simultâneos podem tentar criar a linha ao mesmo tempo. O
    // índice parcial deixa só um vencer, e o outro já encontra o convite pronto.
    if (error?.message.includes("gift_invitations_single_admin")) return;
    if (error?.code === "23505") throw new Error(adminCodeTakenMessage);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.rpc("rotate_gift_invitation_code", {
    p_code_ciphertext: codeRecord.code_ciphertext,
    p_code_hash: codeRecord.code_hash,
    p_code_hint: codeRecord.code_hint,
    p_invitation_id: existing.id,
  });

  if (error?.code === "23505") throw new Error(adminCodeTakenMessage);
  if (error) throw error;
}

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function fingerprintInvitationRequest(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0];
  const address =
    forwardedFor?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? "";

  return createHmac("sha256", getInvitationSecret())
    .update(`gift-invitation-access:${address}:${userAgent}`)
    .digest("hex");
}

export function setInvitationSessionCookie(
  response: NextResponse,
  token: string,
) {
  response.cookies.set(invitationSessionCookie, token, {
    httpOnly: true,
    maxAge: sessionDurationSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearInvitationSessionCookie(response: NextResponse) {
  response.cookies.set(invitationSessionCookie, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function invitationSessionExpiry() {
  return new Date(Date.now() + sessionDurationSeconds * 1_000).toISOString();
}

async function resolveInvitationSession(
  token: string | undefined,
): Promise<InvitationSession | null> {
  if (!token || token.length < 40 || token.length > 100) return null;

  const supabase = createSupabaseAdminClient();
  const { data: session, error: sessionError } = await supabase
    .from("gift_invitation_sessions")
    .select(
      "id,invitation_id,expires_at,last_seen_at,revoked_at,session_version",
    )
    .eq("token_hash", hashSessionToken(token))
    .maybeSingle();

  if (sessionError || !session || session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) return null;

  const { data: invitation, error: invitationError } = await supabase
    .from("gift_invitations")
    .select(
      "id,display_name,audience,is_active,is_admin,expires_at,session_version",
    )
    .eq("id", session.invitation_id)
    .maybeSingle();

  if (
    invitationError ||
    !invitation ||
    !invitation.is_active ||
    invitation.session_version !== session.session_version ||
    (invitation.expires_at &&
      new Date(invitation.expires_at).getTime() <= Date.now()) ||
    (invitation.audience !== "amigos" &&
      invitation.audience !== "familia")
  ) {
    return null;
  }

  // Trocar GIFT_ADMIN_CODE precisa derrubar a sessão administrativa antiga já
  // na requisição seguinte, sem depender de alguém tentar entrar de novo. Só o
  // casal paga esse par de consultas extras.
  if (invitation.is_admin) {
    try {
      await ensureAdminInvitation();

      const { data: current } = await supabase
        .from("gift_invitations")
        .select("session_version")
        .eq("id", invitation.id)
        .maybeSingle();

      if (!current || current.session_version !== session.session_version) {
        return null;
      }
    } catch (error) {
      // Um código mal configurado não deve derrubar quem já estava dentro.
      console.error("Admin invitation sync failed", error);
    }
  }

  if (
    Date.now() - new Date(session.last_seen_at).getTime() >
    24 * 60 * 60 * 1_000
  ) {
    void supabase
      .from("gift_invitation_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", session.id);
  }

  return {
    invitation: {
      audience: invitation.audience,
      displayName: invitation.display_name,
      id: invitation.id,
      isAdmin: invitation.is_admin,
      sessionVersion: invitation.session_version,
    },
    sessionId: session.id,
  };
}

export function readInvitationSession(request: NextRequest) {
  return resolveInvitationSession(
    request.cookies.get(invitationSessionCookie)?.value,
  );
}

export async function readInvitationSessionFromCookies() {
  const store = await cookies();
  return resolveInvitationSession(store.get(invitationSessionCookie)?.value);
}
