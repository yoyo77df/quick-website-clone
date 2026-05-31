import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$chatId")({
  component: ChatPage,
});

type Message = { id: string; chat_id: string; sender_id: string; content: string; created_at: string; mentions_admin?: boolean };
type Chat = { id: string; user_a: string; user_b: string };
type Profile = { id: string; username: string; avatar_url: string | null; is_online: boolean };

function ChatPage() {
  const { chatId } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const participantOther = chat && user && (chat.user_a === user.id || chat.user_b === user.id)
    ? profiles[chat.user_a === user.id ? chat.user_b : chat.user_a]
    : null;
  const adminViewing = chat && user && chat.user_a !== user.id && chat.user_b !== user.id;
  const userA = chat ? profiles[chat.user_a] : null;
  const userB = chat ? profiles[chat.user_b] : null;

  useEffect(() => {
    const load = async () => {
      const { data: c } = await supabase.from("chats").select("id, user_a, user_b").eq("id", chatId).single();
      if (!c) return;
      setChat(c as Chat);
      const { data: m } = await supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: true });
      const msgs = (m ?? []) as Message[];
      setMessages(msgs);
      const ids = Array.from(new Set([c.user_a, c.user_b, ...msgs.map((x) => x.sender_id)]));
      const { data: ps } = await supabase.from("profiles").select("id, username, avatar_url, is_online").in("id", ids);
      const map: Record<string, Profile> = {};
      (ps ?? []).forEach((p) => { map[p.id] = p as Profile; });
      setProfiles(map);
    };
    load();

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        async (payload) => {
          const next = payload.new as Message;
          setMessages((prev) => prev.some((m) => m.id === next.id) ? prev : [...prev, next]);
          setProfiles((prev) => {
            if (prev[next.sender_id]) return prev;
            supabase.from("profiles").select("id, username, avatar_url, is_online").eq("id", next.sender_id).single().then(({ data }) => {
              if (data) setProfiles((p) => ({ ...p, [data.id]: data as Profile }));
            });
            return prev;
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText("");
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, chat_id: chatId, sender_id: user.id, content, created_at: new Date().toISOString() }]);
    const { data, error } = await supabase.from("messages").insert({ chat_id: chatId, sender_id: user.id, content }).select().single();
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
      return;
    }
    setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Message) : m)).filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i));
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-border p-4 flex items-center gap-3 bg-surface/60 backdrop-blur">
        <Link to={isAdmin && adminViewing ? "/admin" : "/chat"} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /></Link>
        {adminViewing && userA && userB ? (
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-sm flex items-center gap-2">
                <span>{userA.username}</span>
                <span className="text-muted-foreground">↔</span>
                <span>{userB.username}</span>
              </p>
              <p className="text-xs text-muted-foreground">Admin view — your messages are visible to both users</p>
            </div>
          </div>
        ) : participantOther ? (
          <Link to="/profile/$userId" params={{ userId: participantOther.id }} className="flex items-center gap-3 hover:opacity-80">
            <div className="relative">
              <Avatar className="w-9 h-9"><AvatarImage src={participantOther.avatar_url ?? undefined} /><AvatarFallback>{participantOther.username.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
              {participantOther.is_online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />}
            </div>
            <div><p className="font-semibold text-sm">{participantOther.username}</p><p className="text-xs text-muted-foreground">{participantOther.is_online ? "Online" : "Offline"}</p></div>
          </Link>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          const sender = profiles[m.sender_id];
          const senderIsAdmin = chat && sender && m.sender_id !== chat.user_a && m.sender_id !== chat.user_b;
          return (
            <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
              {!mine && sender && (
                <span className={cn("text-[11px] mb-0.5 px-2 flex items-center gap-1", senderIsAdmin ? "text-primary font-semibold" : "text-muted-foreground")}>
                  {senderIsAdmin && <ShieldCheck className="w-3 h-3" />}
                  {senderIsAdmin ? "Admin" : sender.username}
                </span>
              )}
              <div className={cn("max-w-[75%] px-4 py-2 rounded-2xl text-sm",
                senderIsAdmin ? "bg-primary/15 border border-primary/40 text-foreground" :
                mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-surface-elevated text-foreground rounded-bl-sm")}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-border p-3 flex gap-2 bg-surface/60 backdrop-blur">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={adminViewing ? "Reply as Admin…" : "Type a message… (mention @admin to alert moderators)"} className="flex-1" />
        <Button type="submit" className="gradient-primary text-primary-foreground"><Send className="w-4 h-4" /></Button>
      </form>
    </div>
  );
}

