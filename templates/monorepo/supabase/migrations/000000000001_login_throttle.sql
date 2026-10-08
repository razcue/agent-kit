-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 000000000001_login_throttle.sql
--
-- Login throttling for POST /api/auth/login. Supabase Auth rate-limits
-- sign-ins per IP, but every login reaches it from the BFF's own address, so
-- it can't tell clients apart. The BFF records failed attempts here (shared
-- across serverless instances) and refuses new ones when, in the last 15
-- minutes, there were 5 failures for the same login or 20 from the same IP.
-- A successful login clears that login's failures; rows older than a day are
-- pruned on each write. service_role only. Re-runnable.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.login_failures (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  login      text        NOT NULL,
  ip         text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_failures_login_idx ON public.login_failures (login, created_at);
CREATE INDEX IF NOT EXISTS login_failures_ip_idx    ON public.login_failures (ip, created_at);

ALTER TABLE public.login_failures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_failures FROM anon, authenticated;

-- Seconds until the caller may try again (0 = allowed). The lock lifts when the
-- failure that reached a limit leaves the 15-minute window.
CREATE OR REPLACE FUNCTION public.login_wait_seconds(p_login text, p_ip text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH by_login AS (
    SELECT created_at FROM public.login_failures
    WHERE login = p_login AND created_at > now() - interval '15 minutes'
    ORDER BY created_at DESC OFFSET 4 LIMIT 1
  ),
  by_ip AS (
    SELECT created_at FROM public.login_failures
    WHERE p_ip IS NOT NULL AND ip = p_ip AND created_at > now() - interval '15 minutes'
    ORDER BY created_at DESC OFFSET 19 LIMIT 1
  )
  SELECT GREATEST(
    0,
    COALESCE(ceil(extract(epoch FROM (SELECT created_at FROM by_login) + interval '15 minutes' - now()))::integer, 0),
    COALESCE(ceil(extract(epoch FROM (SELECT created_at FROM by_ip) + interval '15 minutes' - now()))::integer, 0)
  );
$$;

-- Records a failure, or clears the login's failures on success.
CREATE OR REPLACE FUNCTION public.login_record(p_login text, p_ip text, p_success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_success THEN
    DELETE FROM public.login_failures WHERE login = p_login;
  ELSE
    INSERT INTO public.login_failures (login, ip) VALUES (p_login, p_ip);
  END IF;
  DELETE FROM public.login_failures WHERE created_at < now() - interval '1 day';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.login_wait_seconds(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.login_record(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_wait_seconds(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.login_record(text, text, boolean) TO service_role;

INSERT INTO public._migrations (filename) VALUES ('000000000001_login_throttle.sql')
ON CONFLICT (filename) DO NOTHING;
