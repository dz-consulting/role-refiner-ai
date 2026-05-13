
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS langfuse_assess_trace_id text;

CREATE TABLE IF NOT EXISTS public.assessment_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  target_type text NOT NULL,
  target_key text NOT NULL,
  original_value text,
  corrected_value text,
  comment text,
  langfuse_trace_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, target_type, target_key)
);

ALTER TABLE public.assessment_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own feedback" ON public.assessment_feedback
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own feedback" ON public.assessment_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own feedback" ON public.assessment_feedback
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own feedback" ON public.assessment_feedback
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_assessment_feedback_updated_at
  BEFORE UPDATE ON public.assessment_feedback
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_assessment_feedback_assessment ON public.assessment_feedback(assessment_id);
