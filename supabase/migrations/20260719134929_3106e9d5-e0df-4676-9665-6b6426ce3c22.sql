
CREATE TABLE public.pages (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pages TO anon, authenticated;
GRANT ALL ON public.pages TO service_role;

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pages_public_read" ON public.pages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pages_admin_write" ON public.pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pages_touch_updated_at BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.pages (slug, title, body_html) VALUES
  ('impressum', 'Impressum', '<p>Bitte im Admin-Bereich unter <code>/admin/pages</code> ausfüllen.</p>'),
  ('datenschutz', 'Datenschutz', '<p>Bitte im Admin-Bereich unter <code>/admin/pages</code> ausfüllen.</p>')
ON CONFLICT (slug) DO NOTHING;
