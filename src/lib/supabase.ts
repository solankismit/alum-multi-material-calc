import { createClient } from "@supabase/supabase-js";

const LOGO_BUCKET = "company-logos";

/**
 * Server-only client using the service-role secret — never import this
 * from a "use client" component. Uploads go through our own API route
 * (src/app/api/user/logo/route.ts), not directly from the browser, so the
 * secret key never reaches the client bundle.
 */
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET;
  if (!url || !key) {
    throw new Error("Supabase is not configured — set SUPABASE_URL and SUPABASE_SECRET.");
  }
  return createClient(url, key);
}

function logoObjectPath(userId: string, extension: string) {
  return `${userId}/${Date.now()}.${extension}`;
}

function extensionFor(mimeType: string): string | null {
  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/svg+xml":
      return "svg";
    default:
      return null;
  }
}

/** Uploads a logo to a PUBLIC bucket (not a signed URL) — a historical
 * invoice's logo must never 404 when a signature expires (Tension 4). */
export async function uploadLogo(userId: string, file: Buffer, mimeType: string): Promise<string> {
  const extension = extensionFor(mimeType);
  if (!extension) {
    throw new Error("Unsupported image type — use PNG, JPG, or SVG.");
  }
  const supabase = getSupabaseAdmin();
  const path = logoObjectPath(userId, extension);
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Deletes a previously-uploaded logo object, given the public URL stored
 * on User.logoUrl. Best-effort — a failure here should never block the
 * caller's own save/replace, just leaves one orphaned object. */
export async function deleteLogoByUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const marker = `/${LOGO_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  if (!path) return;
  try {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(LOGO_BUCKET).remove([path]);
  } catch (error) {
    console.error("Logo cleanup error (non-blocking):", error);
  }
}

export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB cap, per P1 decision
