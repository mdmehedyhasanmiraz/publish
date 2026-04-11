import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize, type SerializeOptions } from "cookie";

/**
 * Keep cookies small: only tokens in cookies; user payload lives in localStorage (library default).
 * Must match `encode: "tokens-only"` on createServerClient / proxy.
 */
function browserCookieGetAll() {
  if (typeof document === "undefined") return [];
  const parsed = parse(document.cookie);
  return Object.keys(parsed).map((name) => ({
    name,
    value: parsed[name] ?? "",
  }));
}

function browserCookieSetAll(
  cookiesToSet: { name: string; value: string; options?: SerializeOptions }[],
  _headers: Record<string, string>,
) {
  if (typeof document === "undefined") return;
  cookiesToSet.forEach(({ name, value, options }) => {
    document.cookie = serialize(name, value, options ?? {});
  });
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        encode: "tokens-only",
        getAll: browserCookieGetAll,
        setAll: browserCookieSetAll,
      },
    },
  );
}
