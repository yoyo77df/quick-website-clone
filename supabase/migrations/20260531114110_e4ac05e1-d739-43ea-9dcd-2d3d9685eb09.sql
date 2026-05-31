DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_delete ON public.profiles;
DROP POLICY IF EXISTS posts_update_own_or_admin ON public.posts;
DROP POLICY IF EXISTS posts_delete_own_or_admin ON public.posts;
DROP POLICY IF EXISTS chats_select_participant_or_admin ON public.chats;
DROP POLICY IF EXISTS messages_select_participant_or_admin ON public.messages;
DROP POLICY IF EXISTS reports_select_own_or_admin ON public.reports;
DROP POLICY IF EXISTS reports_update_admin ON public.reports;
DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;

CREATE POLICY profiles_admin_update ON public.profiles
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY profiles_admin_delete ON public.profiles
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY posts_update_own_or_admin ON public.posts
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY posts_delete_own_or_admin ON public.posts
FOR DELETE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY chats_select_participant_or_admin ON public.chats
FOR SELECT TO authenticated
USING (
  auth.uid() = user_a
  OR auth.uid() = user_b
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY messages_select_participant_or_admin ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chats c
    WHERE c.id = messages.chat_id
      AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY reports_select_own_or_admin ON public.reports
FOR SELECT TO authenticated
USING (
  auth.uid() = reporter_id
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

CREATE POLICY reports_update_admin ON public.reports
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY user_roles_select_own ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
DROP POLICY IF EXISTS posts_public_read ON storage.objects;