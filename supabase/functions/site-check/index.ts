// Lead Finder website check: fetches one prospect homepage (GET, no form
// submissions) and reports visible problems. Team members only.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { analyseHtml, isPublicHost } from "./analyse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA = "Mozilla/5.0 (compatible; OreeceSiteCheck/1.0; +https://www.oreece.co.nz)";
const MAX_BYTES = 3_000_000;
const MAX_REDIRECTS = 4;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function resolvesPublic(hostname: string) {
  if (!isPublicHost(hostname)) return false;
  if (/^[\d.]+$/.test(hostname) || hostname.includes(":")) return true;
  try {
    const addrs = [
      ...(await Deno.resolveDns(hostname, "A").catch(() => [] as string[])),
      ...(await Deno.resolveDns(hostname, "AAAA").catch(() => [] as string[])),
    ];
    return addrs.length > 0 && addrs.every((a) => isPublicHost(a));
  } catch {
    return false;
  }
}

// Follows redirects by hand so every hop is checked against private addresses.
async function fetchPage(start: URL) {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!["http:", "https:"].includes(url.protocol) || !(await resolvesPublic(url.hostname))) {
      throw new Error("Only public http(s) websites can be checked");
    }
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: AbortSignal.timeout(15_000),
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel();
      url = new URL(location, url);
      continue;
    }
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      chunks.push(value);
      if (size >= MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk.subarray(0, size - offset), offset);
      offset += chunk.length;
    }
    const html = new TextDecoder().decode(bytes);
    return { status: res.status, finalUrl: url.toString(), html };
  }
  throw new Error("Too many redirects");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // Caller must be a signed-in team member.
  const auth = req.headers.get("Authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return json({ error: "Sign in required" }, 401);
  const { data: isMember } = await supabase.rpc("is_team_member", { _user_id: userData.user.id });
  if (!isMember) return json({ error: "Team members only" }, 403);

  let target: URL;
  try {
    const { url } = await req.json();
    target = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return json({ error: "Send { url } with a website address" }, 400);
  }

  const started = performance.now();
  try {
    const page = await fetchPage(target);
    return json(analyseHtml(page.html, { status: page.status, finalUrl: page.finalUrl, seconds: (performance.now() - started) / 1000 }));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({
      status: "ERR",
      finalUrl: target.toString(),
      error: message,
      issues: [/certificate|ssl|tls/i.test(message)
        ? "The site's security certificate is invalid or expired"
        : `The website could not be loaded (${message})`],
    });
  }
});
