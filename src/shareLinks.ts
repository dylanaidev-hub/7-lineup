import { supabase } from "./lib/supabaseClient";
import {
  encodeSharePayloadObject,
  normalizeSharedLineup,
  type DecodeValidators,
  type SharedLineup,
} from "./lineupShare";

const SHARE_TABLE = "share_links";
const CODE_LENGTH = 8;
const CODE_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export const createShortCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(CODE_LENGTH)), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length])
    .join("");

export const buildLineupUrlFromPayload = <TFormation extends string>(
  payload: SharedLineup<TFormation>,
  origin: string,
) => {
  const url = new URL("/app/lineup", origin);
  url.searchParams.set("pitch", String(payload.pitchSize ?? 7));
  url.searchParams.set("lineup", encodeSharePayloadObject(payload));
  return url;
};

/**
 * Stores the payload and returns its short link, or null if that is not
 * possible — no Supabase, offline, payload over the size constraint. Callers
 * fall back to the inline `?lineup=` URL, so this never throws.
 */
export const createShortShareLink = async <TFormation extends string>(
  payload: SharedLineup<TFormation>,
  currentHref: string,
) => {
  if (!supabase) return null;

  const id = createShortCode();

  try {
    const { error } = await supabase.from(SHARE_TABLE).insert({ id, payload });
    if (error) return null;
  } catch {
    return null;
  }

  return new URL(`/s/${id}`, currentHref);
};

export const resolveShortShareLink = async <TFormation extends string>(
  code: string,
  validators: DecodeValidators<TFormation>,
) => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from(SHARE_TABLE).select("payload").eq("id", code).maybeSingle();
    if (error || !data) return null;

    // The row is anon-writable, so it gets the same validation as a pasted URL.
    return normalizeSharedLineup<TFormation>((data as { payload: unknown }).payload, validators);
  } catch {
    return null;
  }
};
