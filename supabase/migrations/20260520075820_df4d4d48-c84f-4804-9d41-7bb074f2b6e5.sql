
ALTER TABLE public.report_comments
  ADD CONSTRAINT report_comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
