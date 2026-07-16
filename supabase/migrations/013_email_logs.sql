CREATE TABLE IF NOT EXISTS public.email_logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email         text NOT NULL,
  type          text NOT NULL,
  subject       text,
  status        text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'pending', 'error')),
  scheduled_for timestamptz,
  sent_at       timestamptz,
  error_message text,
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_email_logs" ON public.email_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS email_logs_user_id_idx        ON public.email_logs (user_id);
CREATE INDEX IF NOT EXISTS email_logs_created_at_idx     ON public.email_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS email_logs_pending_sched_idx  ON public.email_logs (scheduled_for) WHERE status = 'pending';
