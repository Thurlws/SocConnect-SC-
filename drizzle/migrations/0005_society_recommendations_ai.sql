CREATE TABLE public.society_fit_cache (user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, society_id uuid NOT NULL REFERENCES public.societies(id) ON DELETE CASCADE, reason text NOT NULL, context_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,society_id));
GRANT SELECT ON public.society_fit_cache TO authenticated;
GRANT ALL ON public.society_fit_cache TO service_role;
ALTER TABLE public.society_fit_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own society fit" ON public.society_fit_cache FOR SELECT TO authenticated USING (user_id=auth.uid() AND public.society_visible(society_id,auth.uid()));
CREATE TABLE public.society_ai_state (feature text PRIMARY KEY, status integer NOT NULL, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.society_ai_state TO service_role;
ALTER TABLE public.society_ai_state ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.recommend_societies() RETURNS TABLE(society_id uuid, slug text, score bigint, matched_interests text[]) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT s.id,s.slug,count(pi.interest_id),coalesce(array_agg(i.name ORDER BY i.name) FILTER(WHERE pi.interest_id IS NOT NULL),'{}'::text[])
 FROM public.societies s LEFT JOIN public.society_tags st ON st.society_id=s.id LEFT JOIN public.profile_interests pi ON pi.interest_id=st.interest_id AND pi.profile_id=auth.uid() LEFT JOIN public.interests i ON i.id=pi.interest_id
 WHERE auth.uid() IS NOT NULL AND s.status='active' AND public.society_visible(s.id,auth.uid()) AND NOT EXISTS(SELECT 1 FROM public.society_memberships m WHERE m.society_id=s.id AND m.user_id=auth.uid() AND m.status IN ('member','pending')) AND NOT public.is_society_committee(s.id,auth.uid())
 GROUP BY s.id ORDER BY count(pi.interest_id) DESC,s.name;
$$;
REVOKE ALL ON FUNCTION public.recommend_societies() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.recommend_societies() TO authenticated;
CREATE OR REPLACE FUNCTION public.reserve_society_ai(_uid uuid,_feature text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE used integer; lim integer;
BEGIN
 lim := CASE _feature WHEN 'society_fit' THEN 20 WHEN 'society_ask' THEN 60 WHEN 'society_proposal' THEN 10 ELSE 0 END;
 IF lim=0 THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_uid::text||_feature,0));
 SELECT count(*) INTO used FROM public.ai_usage WHERE user_id=_uid AND feature=_feature AND created_at>now()-interval '1 hour';
 IF used>=lim THEN RETURN false; END IF;
 INSERT INTO public.ai_usage(user_id,feature) VALUES(_uid,_feature); RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_society_ai(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_society_ai(uuid,text) TO service_role;
CREATE POLICY "Committee creates proposals" ON public.collaboration_proposals FOR INSERT TO authenticated WITH CHECK (created_by=auth.uid() AND society_a<>society_b AND (public.is_society_committee(society_a,auth.uid()) OR public.is_society_committee(society_b,auth.uid())) AND public.society_visible(society_a,auth.uid()) AND public.society_visible(society_b,auth.uid()) AND source IN ('ai','committee'));
CREATE POLICY "Committee edits proposals" ON public.collaboration_proposals FOR UPDATE TO authenticated USING (public.is_society_committee(society_a,auth.uid()) OR public.is_society_committee(society_b,auth.uid())) WITH CHECK (public.is_society_committee(society_a,auth.uid()) OR public.is_society_committee(society_b,auth.uid()));
GRANT INSERT,UPDATE ON public.collaboration_proposals TO authenticated;