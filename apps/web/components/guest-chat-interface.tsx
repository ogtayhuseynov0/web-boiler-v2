"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, CheckCircle, MessageSquare } from "lucide-react";
import { invitesApi } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface GuestChatInterfaceProps {
  inviteCode: string;
  ownerName: string;
  guestName: string;
  topic?: string;
  onStoryCreated?: () => void;
  className?: string;
}

export function GuestChatInterface({
  inviteCode,
  ownerName,
  guestName,
  topic,
  onStoryCreated,
  className,
}: GuestChatInterfaceProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat session
  const initSession = useCallback(async () => {
    setLoading(true);
    const res = await invitesApi.getOrCreateChatSession(inviteCode);

    if (res.data) {
      setSessionId(res.data.session.id);
      setMessages(
        res.data.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      );

      // If no messages, add initial greeting
      if (res.data.messages.length === 0) {
        const greeting = topic
          ? `Hi ${guestName}! I'd love to hear your memories about ${ownerName}. ${ownerName} mentioned they'd especially love to hear about: "${topic}". What comes to mind when you think about that?`
          : `Hi ${guestName}! I'd love to hear your memories and stories about ${ownerName}. What's a moment or memory that stands out to you?`;

        setMessages([
          {
            id: "greeting",
            role: "assistant",
            content: greeting,
          },
        ]);
      }
    } else {
      toast.error("Failed to start chat session");
    }

    setLoading(false);
  }, [inviteCode, guestName, ownerName, topic]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || sending) return;

    const userMessage = input.trim();
    setInput("");
    setSending(true);

    // Optimistically add user message
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: userMessage },
    ]);

    const res = await invitesApi.sendChatMessage(inviteCode, sessionId, userMessage);

    if (res.data) {
      // Add AI response
      setMessages((prev) => [
        ...prev,
        {
          id: res.data!.messageId,
          role: "assistant",
          content: res.data!.response,
        },
      ]);
    } else {
      toast.error("Failed to send message");
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndAndSave = async () => {
    if (!sessionId || messages.length < 3) {
      toast.error("Please have a longer conversation before saving");
      return;
    }

    setEnding(true);

    const res = await invitesApi.endChatAndSaveStory(inviteCode, sessionId, guestName);

    if (res.data?.success) {
      toast.success(res.data.message);
      onStoryCreated?.();
    } else {
      toast.error("Failed to save story");
    }

    setEnding(false);
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 space-y-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your memory..."
            className="resize-none min-h-[60px]"
            disabled={sending || ending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending || ending}
            size="icon"
            className="h-auto"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {messages.length >= 3 && (
          <Button
            onClick={handleEndAndSave}
            disabled={ending}
            variant="outline"
            className="w-full"
          >
            {ending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Save Story & Submit for Review
          </Button>
        )}

        {messages.length < 3 && (
          <p className="text-xs text-center text-muted-foreground">
            Continue chatting to share your story. When you're done, you can save and submit it.
          </p>
        )}
      </div>
    </div>
  );
}
