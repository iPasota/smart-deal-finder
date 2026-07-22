
-- Guest (unauthenticated) email watches with double opt-in
CREATE TABLE public.email_watches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  asin TEXT NOT NULL,
  product_title TEXT NOT NULL,
  product_image_url TEXT,
  product_brand TEXT,
  target_price_cents INTEGER NOT NULL,
  current_price_cents INTEGER,
  condition TEXT NOT NULL,
  doi_token TEXT NOT NULL UNIQUE,
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX email_watches_email_idx ON public.email_watches (lower(email));
CREATE INDEX email_watches_asin_idx ON public.email_watches (asin);
CREATE INDEX email_watches_active_idx ON public.email_watches (confirmed_at, unsubscribed_at) WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL;

GRANT SELECT, UPDATE, DELETE ON public.email_watches TO authenticated;
GRANT ALL ON public.email_watches TO service_role;

ALTER TABLE public.email_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email watches"
  ON public.email_watches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER email_watches_touch_updated
  BEFORE UPDATE ON public.email_watches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Editable email templates (subject + html body with {{placeholders}})
CREATE TABLE public.email_templates (
  name TEXT NOT NULL PRIMARY KEY,
  display_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER email_templates_touch_updated
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed default templates
INSERT INTO public.email_templates (name, display_name, subject, html_body, description) VALUES
('doi-confirmation', 'Preiswecker: DOI-Bestätigung',
 'Bitte bestätige deinen Preiswecker',
 '<h1 style="font-size:20px;margin:0 0 12px;">Fast geschafft!</h1>
<p>Du hast einen Preiswecker für <strong>{{product_title}}</strong> gesetzt.</p>
<p>Wir mailen dich, sobald der Warehouse-Preis auf <strong>{{target_price}}</strong> oder darunter fällt.</p>
<p style="margin:24px 0;">
  <a href="{{confirm_url}}" style="display:inline-block;padding:12px 20px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Preiswecker bestätigen</a>
</p>
<p style="color:#6b7280;font-size:12px;">Falls du diesen Preiswecker nicht angefordert hast, ignoriere diese E-Mail einfach.</p>',
 'Wird gesendet, wenn ein Gast einen Preiswecker setzt. Muss den Link {{confirm_url}} enthalten. Verfügbare Platzhalter: {{product_title}}, {{target_price}}, {{confirm_url}}'),

('price-alert', 'Preiswecker: Preis erreicht',
 'Preis-Alarm: {{product_title}}',
 '<h1 style="font-size:20px;margin:0 0 12px;">🎯 Preis erreicht!</h1>
<p>Der Preis für <strong>{{product_title}}</strong> ist auf <strong>{{current_price}}</strong> gefallen (dein Ziel: {{target_price}}).</p>
<p style="margin:20px 0;">
  <a href="{{deal_url}}" style="display:inline-block;padding:12px 20px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Jetzt bei Amazon ansehen</a>
</p>
<p style="color:#6b7280;font-size:12px;">Zustand: {{condition}} · Marke: {{brand}}</p>',
 'Wird gesendet, wenn ein Warehouse-Preis das Ziel erreicht. Platzhalter: {{product_title}}, {{current_price}}, {{target_price}}, {{deal_url}}, {{condition}}, {{brand}}'),

('admin-daily-digest', 'Admin: Tages-Report',
 'whdfinder Tages-Report: {{new_count}} neue Produkte',
 '<h1 style="font-size:20px;margin:0 0 12px;">Tages-Report</h1>
<p>In den letzten 24 Stunden wurden <strong>{{new_count}}</strong> neue Produkte importiert.</p>
<h2 style="font-size:16px;margin:20px 0 8px;">Nach Kategorie & Zustand</h2>
{{summary_table}}
<h2 style="font-size:16px;margin:20px 0 8px;">Aktive Preiswecker</h2>
<p>Gäste (bestätigt): {{guest_watches_active}} · Nutzer-Konten: {{user_watches_active}}</p>',
 'Täglicher Admin-Digest. Platzhalter: {{new_count}}, {{summary_table}} (HTML-Tabelle), {{guest_watches_active}}, {{user_watches_active}}');
