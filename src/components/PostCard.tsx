import { Link, useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GAME_LABEL, type GameValue } from "@/lib/constants";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquarePlus } from "lucide-react";
import { motion } from "framer-motion";

export type PostWithAuthor = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  game: GameValue;
  skill_role: string;
  availability: string;
  image_url: string | null;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    is_online: boolean;
    category: string;
  } | null;
};

export function PostCard({ post }: { post: PostWithAuthor }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleHire = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (user.id === post.user_id) return toast.info("That's your own post");

    const [a, b] = [user.id, post.user_id].sort();
    const { data: existing } = await supabase
      .from("chats")
      .select("id")
      .eq("user_a", a)
      .eq("user_b", b)
      .maybeSingle();

    let chatId = existing?.id;
    if (!chatId) {
      const { data, error } = await supabase
        .from("chats")
        .insert({ user_a: a, user_b: b, post_id: post.id })
        .select("id")
        .single();
      if (error) return toast.error(error.message);
      chatId = data.id;
    }
    navigate({ to: "/chat/$chatId", params: { chatId: chatId! } });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Link to="/posts/$postId" params={{ postId: post.id }} className="block group">
        <div className="glass rounded-xl overflow-hidden hover:border-primary/40 transition-all hover:-translate-y-0.5 flex flex-col h-full">
          {post.image_url && (
            <div className="aspect-video bg-surface-elevated overflow-hidden">
              <img src={post.image_url} alt={post.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          )}
          <div className="p-5 flex flex-col flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent text-[10px] font-semibold uppercase tracking-wider">
                {GAME_LABEL[post.game]}
              </span>
              {post.skill_role && (
                <span className="text-[10px] text-muted-foreground">{post.skill_role}</span>
              )}
            </div>
            <h3 className="font-semibold text-base leading-tight line-clamp-2">{post.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.description}</p>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px] bg-surface-elevated">
                      {(post.profiles?.username ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {post.profiles?.is_online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />
                  )}
                </div>
                <span className="text-xs font-medium truncate">{post.profiles?.username}</span>
              </div>
              <Button size="sm" onClick={handleHire} className="h-7 px-3 gradient-primary text-primary-foreground text-xs font-semibold">
                <MessageSquarePlus className="w-3 h-3 mr-1" /> Hire
              </Button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
