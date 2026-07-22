import * as React from "react";
import { render } from "@react-email/render";
import { template as dbTemplate } from "@/lib/email-templates/db-template";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SITE_NAME = "whdfinder";
const SENDER_DOMAIN = "notify.whdfinder.com";
const FROM_DOMAIN = "notify.whdfinder.com";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function substitute(input: string, vars: Record<string, string>): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{{${key}}}`,
  );
}

export interface EnqueueEmailInput {
  templateName: string; // key in email_templates table
  recipientEmail: string;
  variables?: Record<string, string>;
  idempotencyKey?: string;
  // if true, skip suppression + unsubscribe token (used for DOI mail)
  skipUnsubscribe?: boolean;
}

/**
 * Renders an admin-editable email template and enqueues it into the
 * shared transactional_emails pgmq queue. Uses service-role client.
 */
export async function enqueueDbEmail(input: EnqueueEmailInput): Promise<{ queued: boolean; reason?: string }> {
  const { templateName, recipientEmail, variables = {}, skipUnsubscribe = false } = input;
  const normalizedEmail = recipientEmail.toLowerCase();
  const messageId = crypto.randomUUID();
  const idempotencyKey = input.idempotencyKey || messageId;

  const { data: tpl, error: tplErr } = await supabaseAdmin
    .from("email_templates")
    .select("subject, html_body")
    .eq("name", templateName)
    .maybeSingle();
  if (tplErr || !tpl) throw new Error(`Template '${templateName}' not found`);

  // Suppression check
  if (!skipUnsubscribe) {
    const { data: sup } = await supabaseAdmin
      .from("suppressed_emails")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (sup) {
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: recipientEmail,
        status: "suppressed",
      });
      return { queued: false, reason: "suppressed" };
    }
  }

  // Unsubscribe token (reuse or create)
  let unsubscribeToken = "";
  if (!skipUnsubscribe) {
    const { data: existing } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token, used_at")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (existing && !existing.used_at) {
      unsubscribeToken = existing.token;
    } else if (!existing) {
      unsubscribeToken = generateToken();
      await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .upsert({ token: unsubscribeToken, email: normalizedEmail }, { onConflict: "email", ignoreDuplicates: true });
      const { data: stored } = await supabaseAdmin
        .from("email_unsubscribe_tokens")
        .select("token")
        .eq("email", normalizedEmail)
        .maybeSingle();
      if (stored) unsubscribeToken = stored.token;
    }
  }

  const subject = substitute(tpl.subject, variables);
  const bodyHtml = substitute(tpl.html_body, variables);

  const element = React.createElement(dbTemplate.component, {
    __subject: subject,
    __html: bodyHtml,
    __preview: subject,
  });
  const html = await render(element);
  const text = await render(element, { plainText: true });

  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: recipientEmail,
    status: "pending",
  });

  const payload: Record<string, unknown> = {
    message_id: messageId,
    to: recipientEmail,
    from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
    sender_domain: SENDER_DOMAIN,
    subject,
    html,
    text,
    purpose: "transactional",
    label: templateName,
    idempotency_key: idempotencyKey,
    queued_at: new Date().toISOString(),
  };
  if (unsubscribeToken) payload.unsubscribe_token = unsubscribeToken;

  const { error } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload,
  });

  if (error) {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: recipientEmail,
      status: "failed",
      error_message: `enqueue failed: ${error.message}`,
    });
    throw new Error(`Enqueue failed: ${error.message}`);
  }

  return { queued: true };
}
