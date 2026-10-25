// Website "schedule a call" → Oreece HQ.
// 1. Always records the request first: a lead (clients, status 'lead'), the
//    requested time as an activity, and a follow-up on the requested day.
// 2. Then emails info@oreece.com, only if RESEND_API_KEY is set.
// Self-contained (one file) so it can be pasted into the Supabase dashboard editor.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const call = {
    name: clip(body.name, 120),
    email: clip(body.email, 200),
    phone: clip(body.phone, 40),
    company: clip(body.company, 160),
    date: clip(body.preferredDate, 10),
    time: clip(body.preferredTime, 20),
    timezone: clip(body.timezone, 60),
    message: clip(body.message, 3000),
  };
  if (!call.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(call.email) || !/^\d{4}-\d{2}-\d{2}$/.test(call.date)) {
    return json({ error: "Name, a valid email and a date are required" }, 400);
  }
  const when = `${new Date(`${call.date}T00:00:00`).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${call.time} ${call.timezone}`.trim();

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let saved = false;
  try {
    const { data: lead, error } = await supabase
      .from("clients")
      .insert({
        name: call.name,
        company_name: call.company || null,
        email: call.email,
        phone: call.phone || null,
        status: "lead",
        source: "website",
      })
      .select("id")
      .single();
    if (error) throw error;
    saved = true;
    await supabase.from("activities").insert({
      client_id: lead.id,
      type: "note",
      note: [`Discovery call requested: ${when}`, call.message && `Notes: ${call.message}`].filter(Boolean).join("\n"),
    });
    await supabase.from("follow_ups").insert({
      client_id: lead.id,
      title: `Discovery call with ${call.name} (${call.time} ${call.timezone}): send calendar invite`,
      due_date: new Date().toISOString().slice(0, 10),
    });
  } catch (err) {
    console.error("Could not record the call request:", err);
  }

  let emailed = false;
  const key = Deno.env.get("RESEND_API_KEY");
  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("CONTACT_FROM") || "Oreece Website <onboarding@resend.dev>",
          to: [Deno.env.get("CONTACT_TO") || "info@oreece.com"],
          reply_to: call.email,
          subject: `Call request from ${call.name}: ${when}`,
          html: `<h2>New discovery call request</h2>
            <p><strong>When:</strong> ${esc(when)}<br><strong>Name:</strong> ${esc(call.name)}<br><strong>Email:</strong> ${esc(call.email)}
            ${call.phone ? `<br><strong>Phone:</strong> ${esc(call.phone)}` : ""}
            ${call.company ? `<br><strong>Company:</strong> ${esc(call.company)}` : ""}</p>
            ${call.message ? `<p style="white-space:pre-wrap">${esc(call.message)}</p>` : ""}
            <p style="color:#666">${saved ? "Saved in Oreece HQ with a follow-up due today." : "Could not be saved in HQ: add it by hand."}</p>`,
        }),
      });
      emailed = res.ok;
      if (!res.ok) console.error("Email failed:", res.status, await res.text());
    } catch (err) {
      console.error("Email failed:", err);
    }
  }

  if (!saved && !emailed) return json({ error: "We could not book your call" }, 500);
  return json({ ok: true, saved, emailed });
});
