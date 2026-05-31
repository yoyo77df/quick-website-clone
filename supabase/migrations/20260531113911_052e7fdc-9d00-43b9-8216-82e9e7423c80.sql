INSERT INTO public.profiles (id, username, category)
SELECT
  u.id,
  CASE
    WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.username = split_part(u.email, '@', 1))
      THEN split_part(u.email, '@', 1) || '_' || substr(u.id::text, 1, 6)
    ELSE split_part(u.email, '@', 1)
  END AS username,
  'player'::public.user_category AS category
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
ALTER TABLE public.posts
  ADD CONSTRAINT posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS chats_user_a_fkey;
ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS chats_user_b_fkey;
ALTER TABLE public.chats
  ADD CONSTRAINT chats_user_a_fkey
  FOREIGN KEY (user_a) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.chats
  ADD CONSTRAINT chats_user_b_fkey
  FOREIGN KEY (user_b) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;