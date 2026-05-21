-- Add missing foreign key from weekly_reports to profiles
-- This enables PostgREST joins between the two tables
ALTER TABLE public.weekly_reports
  ADD CONSTRAINT weekly_reports_submitted_by_fkey
  FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
