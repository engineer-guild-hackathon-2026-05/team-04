import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizeOrigin(value?: string) {
  if (!value) return null;

  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`).origin;
  } catch {
    return null;
  }
}

function getConfiguredRedirectOrigins() {
  const configuredOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_URL,
  ]
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));

  return Array.from(new Set(configuredOrigins));
}

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function getForwardedOrigin(requestUrl: URL, headers: Headers) {
  const forwardedHost = firstForwardedValue(headers.get("x-forwarded-host"));
  if (!forwardedHost) return null;

  const forwardedProto =
    firstForwardedValue(headers.get("x-forwarded-proto")) ?? requestUrl.protocol.replace(":", "");
  return normalizeOrigin(`${forwardedProto}://${forwardedHost}`);
}

function getSafeNextPath(nextParam: string | null) {
  const fallbackPath = "/app";
  if (!nextParam?.startsWith("/") || nextParam.startsWith("//")) return fallbackPath;

  const lowerNext = nextParam.toLowerCase();
  if (
    nextParam.includes("\\") ||
    lowerNext.startsWith("/%5c") ||
    lowerNext.startsWith("/%2f")
  ) {
    return fallbackPath;
  }

  return nextParam;
}

function getSafeRedirectOrigin(requestUrl: URL, headers: Headers) {
  const configuredOrigins = getConfiguredRedirectOrigins();
  const fallbackOrigin = requestUrl.origin;
  const allowedRedirectOrigins = new Set([requestUrl.origin, ...configuredOrigins]);
  const isLocalEnv = process.env.NODE_ENV === "development";
  const forwardedOrigin = isLocalEnv ? null : getForwardedOrigin(requestUrl, headers);

  if (forwardedOrigin && allowedRedirectOrigins.has(forwardedOrigin)) {
    return forwardedOrigin;
  }

  if (forwardedOrigin) {
    console.warn("Ignored untrusted forwarded auth callback origin.", { forwardedOrigin });
  }

  return fallbackOrigin;
}

// Supabase Auth が認可後にリダイレクトしてくるエンドポイント。
// メール確認・パスワードリセット・OAuth（Google など）すべてここを経由する。
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const code = searchParams.get("code");
  const redirectOrigin = getSafeRedirectOrigin(requestUrl, request.headers);

  // Open Redirect 防止: 同一オリジン内の相対パスのみ許可。
  const next = getSafeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, redirectOrigin));
    }
  }

  // コード欠落・交換失敗時はエラーページへ。
  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", redirectOrigin));
}
