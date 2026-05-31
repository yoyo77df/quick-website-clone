import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GAME_LABEL, type GameValue } from "@/lib/constants";
import { ArrowLeft, Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/posts/$postId")({
  component: PostDetailPage,
});

type PostDetail = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  game: GameValue;
  skill_role: string;
  availability: string;
  social_links: Record<string, string>;
  image_url: string | null;
  created_at: string;
  profiles: { username: string; avatar_url: string | null; is_online: boolean } | null;
};

function PostDetailPage() {
  const { postId } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetail | null>(null);

  useEffect(() => {
    supabase
      .from("posts")
      .select("*, profiles!posts_user_id_fkey(username, avatar_url, is_online)")
      .eq("id", postId)
      .maybeSingle()
      .then(({ data }) => setPost(data as unknown as PostDetail | null));
  }, [postId]);

  const hire = async () => {
    if (!user || !post) return;
    if (user.id === post.user_id) return toast.info("That's your own post");
    const [a, b] = [user.id, post.user_id].sort();
    const { data: existing } = await supabase.from("chats").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    let chatId = existing?.id;
    if (!chatId) {
      const { data, error } = await supabase.from("chats").insert({ user_a: a, user_b: b, post_id: post.id }).select("id").single();
      if (error) return toast.error(error.message);
      chatId = data.id;
    }
    navigate({ to: "/chat/$chatId", params: { chatId: chatId! } });
  };

  const del = async () => {
    if (!post) return;
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/dashboard" });
  };

  if (!post) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  const canDelete = user?.id === post.user_id || isAdmin;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <article className="glass rounded-2xl overflow-hidden">
        {post.image_url && (
          <div className="aspect-video bg-surface-elevated overflow-hidden">
            <img src={post.image_url} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6 lg:p-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent text-[10px] font-semibold uppercase">{GAME_LABEL[post.game]}</span>
            {post.skill_role && <span className="text-xs text-muted-foreground">{post.skill_role}</span>}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{post.title}</h1>
          <p className="mt-4 text-foreground/90 whitespace-pre-wrap">{post.description}</p>

          {post.availability && (
            <p className="mt-4 text-sm"><span className="text-muted-foreground">Availability:</span> {post.availability}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-border">
            <Link to="/profile/$userId" params={{ userId: post.user_id }} className="flex items-center gap-3 group">
              <Avatar className="w-10 h-10">
                <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
                <AvatarFallback>{(post.profiles?.username ?? "?").slice(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold group-hover:underline">{post.profiles?.username}</p>
                <p className="text-xs text-muted-foreground">{post.profiles?.is_online ? "Online now" : "Offline"}</p>
              </div>
            </Link>
            <div className="flex gap-2">
              {canDelete && (
                <Button variant="ghost" size="icon" onClick={del}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              )}
              <Button onClick={hire} className="gradient-primary text-primary-foreground font-semibold">
                <MessageSquarePlus className="w-4 h-4 mr-1" /> Hire
              </Button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
