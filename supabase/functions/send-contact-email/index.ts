// Website contact form → Oreece HQ.
// 1. Always records the enquiry first: a lead (clients, status 'lead'), the
//    message as an activity, and a "reply" follow-up due today (shows on Today).
// 2. Then emails info.oreece@gmail.com (or CONTACT_TO), only if RESEND_API_KEY is set. Email problems
//    never lose the enquiry.
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
  const form = {
    name: clip(body.name, 120),
    email: clip(body.email, 200),
    phone: clip(body.phone, 40),
    company: clip(body.company, 160),
    project: clip(body.project, 120),
    budget: clip(body.budget, 80),
    message: clip(body.message, 5000),
  };
  if (!form.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || !form.message) {
    return json({ error: "Name, a valid email and a message are required" }, 400);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let saved = false;
  try {
    const { data: lead, error } = await supabase
      .from("clients")
      .insert({
        name: form.name,
        company_name: form.company || null,
        email: form.email,
        phone: form.phone || null,
        status: "lead",
        source: "website",
      })
      .select("id")
      .single();
    if (error) throw error;
    saved = true;
    const details = [
      form.project && `Project type: ${form.project}`,
      form.budget && `Budget: ${form.budget}`,
      `Message: ${form.message}`,
    ].filter(Boolean).join("\n");
    await supabase.from("activities").insert({ client_id: lead.id, type: "note", note: `Website enquiry\n${details}` });
    await supabase.from("follow_ups").insert({
      client_id: lead.id,
      title: `Reply to website enquiry from ${form.name}`,
      due_date: new Date().toISOString().slice(0, 10),
    });
  } catch (err) {
    console.error("Could not record the enquiry:", err);
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
          to: [Deno.env.get("CONTACT_TO") || "info.oreece@gmail.com"],
          reply_to: form.email,
          subject: `Website enquiry from ${form.name}${form.company ? ` (${form.company})` : ""}`,
          html: `<h2>New website enquiry</h2>
            <p><strong>Name:</strong> ${esc(form.name)}<br><strong>Email:</strong> ${esc(form.email)}
            ${form.phone ? `<br><strong>Phone:</strong> ${esc(form.phone)}` : ""}
            ${form.company ? `<br><strong>Company:</strong> ${esc(form.company)}` : ""}
            ${form.project ? `<br><strong>Project:</strong> ${esc(form.project)}` : ""}
            ${form.budget ? `<br><strong>Budget:</strong> ${esc(form.budget)}` : ""}</p>
            <p style="white-space:pre-wrap">${esc(form.message)}</p>
            <p style="color:#666">${saved ? "Saved in Oreece HQ as a lead, with a follow-up due today." : "Could not be saved in HQ: add it by hand."}</p>`,
        }),
      });
      emailed = res.ok;
      if (!res.ok) console.error("Email failed:", res.status, await res.text());
    } catch (err) {
      console.error("Email failed:", err);
    }
  }

  if (!saved && !emailed) return json({ error: "We could not send your message" }, 500);
  return json({ ok: true, saved, emailed });
});
