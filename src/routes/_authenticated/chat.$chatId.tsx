import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$chatId")({
  component: ChatPage,
});

type Message = { id: string; chat_id: string; sender_id: string; content: string; created_at: string };
type Chat = { id: string; user_a: string; user_b: string };

function ChatPage() {
  const { chatId } = Route.useParams();
  const { user } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [other, setOther] = useState<{ id: string; username: string; avatar_url: string | null; is_online: boolean } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: c } = await supabase.from("chats").select("id, user_a, user_b").eq("id", chatId).single();
      setChat(c as Chat);
      if (c && user) {
        const otherId = c.user_a === user.id ? c.user_b : c.user_a;
        const { data: p } = await supabase.from("profiles").select("id, username, avatar_url, is_online").eq("id", otherId).single();
        setOther(p as typeof other);
      }
      const { data: m } = await supabase.from("messages").select("*").eq("chat_id", chatId).order("created_at", { ascending: true });
      setMessages((m ?? []) as Message[]);
    };
    load();

    const channel = supabase
      .channel(`chat-${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
        (payload) => setMessages((prev) => {
          const next = payload.new as Message;
          if (prev.some((m) => m.id === next.id)) return prev;
          return [...prev, next];
        }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId, user]);

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
        <Link to="/chat" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /></Link>
        {other && (
          <Link to="/profile/$userId" params={{ userId: other.id }} className="flex items-center gap-3 hover:opacity-80">
            <div className="relative">
              <Avatar className="w-9 h-9"><AvatarImage src={other.avatar_url ?? undefined} /><AvatarFallback>{other.username.slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
              {other.is_online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />}
            </div>
            <div><p className="font-semibold text-sm">{other.username}</p><p className="text-xs text-muted-foreground">{other.is_online ? "Online" : "Offline"}</p></div>
          </Link>
        )}
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] px-4 py-2 rounded-2xl text-sm",
                mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-surface-elevated text-foreground rounded-bl-sm")}>
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-border p-3 flex gap-2 bg-surface/60 backdrop-blur">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="flex-1" />
        <Button type="submit" className="gradient-primary text-primary-foreground"><Send className="w-4 h-4" /></Button>
      </form>
    </div>
  );
}
