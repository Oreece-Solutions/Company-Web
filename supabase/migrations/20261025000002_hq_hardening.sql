-- HQ hardening after go-live:
--   * signed-out visitors (anon) cannot call the platform's action functions
--     (RLS already stopped them changing data; this removes the surface)
--   * Oreece is a New Zealand company: new records default to NZD

REVOKE EXECUTE ON FUNCTION public.convert_prospect(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.refresh_weekly_review(DATE) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.weekly_metrics(DATE) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.convert_quote_to_invoice(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.win_deal(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_prospect(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_weekly_review(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.weekly_metrics(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_invoice(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.win_deal(UUID, BOOLEAN) TO authenticated;

ALTER TABLE public.company_settings ALTER COLUMN default_currency SET DEFAULT 'NZD';
ALTER TABLE public.invoices ALTER COLUMN currency SET DEFAULT 'NZD';
ALTER TABLE public.deals ALTER COLUMN currency SET DEFAULT 'NZD';
ALTER TABLE public.quotes ALTER COLUMN currency SET DEFAULT 'NZD';
