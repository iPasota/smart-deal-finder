
-- 1. Revoke EXECUTE from PUBLIC/anon/authenticated on internal SECURITY DEFINER trigger functions.
--    These are called by triggers only; no one should invoke them via the API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_first_user_to_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- 2. has_role() is used inside RLS policies. Authenticated users must be able to execute it,
--    but anon has no business asking about roles.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 3. Explicit admin-only SELECT policies on internal tables. RLS was already enabled with no
--    policies (fully locked), but scanners flag the absence of intent. Server code uses
--    service_role which bypasses RLS, so behaviour is unchanged.
CREATE POLICY "Admins can view affiliate clicks"
  ON public.affiliate_clicks FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view affiliate tags"
  ON public.affiliate_tags FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage affiliate tags"
  ON public.affiliate_tags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view sync log"
  ON public.keepa_sync_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
