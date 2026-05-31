import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatListPage,
});

type ChatRow = {
  id: string; user_a: string; user_b: string; created_at: string;
  user_a_profile: { username: string; avatar_url: string | null } | null;
  user_b_profile: { username: string; avatar_url: string | null } | null;
};

function ChatListPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatRow[]>([]);

  const loadChats = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("chats")
      .select("id, user_a, user_b, created_at, user_a_profile:profiles!chats_user_a_fkey(username, avatar_url), user_b_profile:profiles!chats_user_b_fkey(username, avatar_url)")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    setChats((data ?? []) as unknown as ChatRow[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadChats();
    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, loadChats)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, loadChats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadChats, user]);

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      {chats.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No conversations yet. Hit "Hire" on a post to start one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((c) => {
            const other = c.user_a === user?.id ? c.user_b_profile : c.user_a_profile;
            const otherId = c.user_a === user?.id ? c.user_b : c.user_a;
            return (
              <Link key={c.id} to="/chat/$chatId" params={{ chatId: c.id }} className="block glass rounded-xl p-4 hover:border-primary/40 transition-all">
                <div className="flex items-center gap-3">
                  <Avatar><AvatarImage src={other?.avatar_url ?? undefined} /><AvatarFallback>{(other?.username ?? otherId).slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                  <div><p className="font-semibold">{other?.username ?? "Unknown"}</p><p className="text-xs text-muted-foreground">Open conversation</p></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
