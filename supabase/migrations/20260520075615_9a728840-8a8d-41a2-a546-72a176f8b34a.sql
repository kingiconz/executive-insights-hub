
-- Comments on weekly reports
CREATE TABLE public.report_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.weekly_reports(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_comments_report ON public.report_comments(report_id);

ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "rc admin all" ON public.report_comments
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Owner of the report can read comments on their reports
CREATE POLICY "rc select own report" ON public.report_comments
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.weekly_reports wr
      WHERE wr.id = report_comments.report_id
        AND wr.submitted_by = auth.uid()
    )
  );

-- Admin inserts (separate explicit policy for clarity; covered by admin all too)
CREATE POLICY "rc insert admin" ON public.report_comments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND author_id = auth.uid());

-- Mark comment seen flag on weekly_reports for unread badge
ALTER TABLE public.weekly_reports
  ADD COLUMN IF NOT EXISTS last_comment_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_comment_at timestamptz;

-- Trigger to bump last_comment_at
CREATE OR REPLACE FUNCTION public.bump_report_comment_ts()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.weekly_reports
    SET last_comment_at = now()
    WHERE id = NEW.report_id;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_bump_report_comment
AFTER INSERT ON public.report_comments
FOR EACH ROW EXECUTE FUNCTION public.bump_report_comment_ts();
