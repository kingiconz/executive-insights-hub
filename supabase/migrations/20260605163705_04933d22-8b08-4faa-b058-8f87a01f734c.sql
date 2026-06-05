
-- Enums
CREATE TYPE public.pipeline_stage AS ENUM (
  'lead_generation','qualification','discovery','proposal','negotiation','delivery','expand_retain'
);
CREATE TYPE public.opportunity_status AS ENUM ('open','active','won','lost','on_hold','cancelled');
CREATE TYPE public.proposal_kind AS ENUM ('bespoke_sent','detailed_requested','detailed_submitted','accepted','rejected');
CREATE TYPE public.proposal_status AS ENUM ('draft','sent','under_review','accepted','rejected','withdrawn');
CREATE TYPE public.activity_kind AS ENUM ('call','meeting','email','site_visit','presentation','proposal_discussion','other');

-- Opportunities
CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  business_area_id uuid NOT NULL,
  assigned_officer uuid,
  title text NOT NULL,
  description text,
  service_category text,
  estimated_value numeric(14,2) DEFAULT 0,
  probability int NOT NULL DEFAULT 20 CHECK (probability BETWEEN 0 AND 100),
  stage public.pipeline_stage NOT NULL DEFAULT 'lead_generation',
  status public.opportunity_status NOT NULL DEFAULT 'open',
  expected_close_date date,
  last_engagement_date date,
  next_follow_up_date date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_opps_institution ON public.opportunities(institution_id);
CREATE INDEX idx_opps_ba ON public.opportunities(business_area_id);
CREATE INDEX idx_opps_stage ON public.opportunities(stage);
CREATE INDEX idx_opps_status ON public.opportunities(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opps select" ON public.opportunities FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.user_has_business_area(auth.uid(), business_area_id));
CREATE POLICY "opps insert" ON public.opportunities FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (public.is_admin(auth.uid()) OR public.user_has_business_area(auth.uid(), business_area_id)));
CREATE POLICY "opps update" ON public.opportunities FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.user_has_business_area(auth.uid(), business_area_id))
WITH CHECK (public.is_admin(auth.uid()) OR public.user_has_business_area(auth.uid(), business_area_id));
CREATE POLICY "opps delete admin" ON public.opportunities FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR created_by = auth.uid());

CREATE TRIGGER opps_touch BEFORE UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Proposals
CREATE TABLE public.opportunity_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  kind public.proposal_kind NOT NULL DEFAULT 'bespoke_sent',
  version text,
  value numeric(14,2) DEFAULT 0,
  status public.proposal_status NOT NULL DEFAULT 'sent',
  proposal_date date NOT NULL DEFAULT (now()::date),
  document_url text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_props_opp ON public.opportunity_proposals(opportunity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_proposals TO authenticated;
GRANT ALL ON public.opportunity_proposals TO service_role;
ALTER TABLE public.opportunity_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "props select" ON public.opportunity_proposals FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id
  AND (public.is_admin(auth.uid()) OR public.user_has_business_area(auth.uid(), o.business_area_id))));
CREATE POLICY "props write" ON public.opportunity_proposals FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id
  AND (public.is_admin(auth.uid()) OR public.user_has_business_area(auth.uid(), o.business_area_id))))
WITH CHECK (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id
  AND (public.is_admin(auth.uid()) OR public.user_has_business_area(auth.uid(), o.business_area_id))));

CREATE TRIGGER props_touch BEFORE UPDATE ON public.opportunity_proposals
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Activities
CREATE TABLE public.opportunity_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  kind public.activity_kind NOT NULL DEFAULT 'meeting',
  activity_date date NOT NULL DEFAULT (now()::date),
  outcome text,
  next_action text,
  next_action_date date,
  assigned_user uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_acts_opp ON public.opportunity_activities(opportunity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_activities TO authenticated;
GRANT ALL ON public.opportunity_activities TO service_role;
ALTER TABLE public.opportunity_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acts select" ON public.opportunity_activities FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id
  AND (public.is_admin(auth.uid()) OR public.user_has_business_area(auth.uid(), o.business_area_id))));
CREATE POLICY "acts write" ON public.opportunity_activities FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id
  AND (public.is_admin(auth.uid()) OR public.user_has_business_area(auth.uid(), o.business_area_id))))
WITH CHECK (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id
  AND (public.is_admin(auth.uid()) OR public.user_has_business_area(auth.uid(), o.business_area_id))));
