"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Sparkles, User, RotateCcw } from "lucide-react";
import { chatApi, ChatMessage, ChatSession } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  onNewMemories?: () => void;
  className?: string;
}

export function ChatInterface({ onNewMemories, className }: ChatInterfaceProps) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeChat = async () => {
    setIsInitializing(true);
    const res = await chatApi.getActiveSession();
    if (res.data) {
      setSession(res.data.session);
      setMessages(res.data.messages || []);
    }
    setIsInitializing(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Optimistically add user message
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: session?.id || "",
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      // Get or create session if needed
      let currentSessionId = session?.id;
      if (!currentSessionId) {
        const sessionRes = await chatApi.getOrCreateSession();
        if (sessionRes.data?.session) {
          setSession(sessionRes.data.session);
          currentSessionId = sessionRes.data.session.id;
        }
      }

      if (!currentSessionId) {
        throw new Error("Failed to create session");
      }

      const res = await chatApi.sendMessage(currentSessionId, userMessage);

      if (res.data) {
        // Update session ID if it was just created
        if (res.data.session_id && res.data.session_id !== session?.id) {
          setSession((prev) => prev ? { ...prev, id: res.data!.session_id } : null);
        }

        // Add assistant response
        const assistantMessage: ChatMessage = {
          id: res.data.message_id,
          session_id: res.data.session_id,
          role: "assistant",
          content: res.data.response,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Notify parent about potential new memories
        onNewMemories?.();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndSession = async () => {
    if (!session?.id || isLoading) return;

    setIsLoading(true);
    try {
      await chatApi.endSession(session.id);
      // Reset to start a new session
      setSession(null);
      setMessages([]);
      onNewMemories?.();
    } catch (error) {
      console.error("Failed to end session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <Card className={cn("flex items-center justify-center h-full", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className={cn("flex flex-col h-full pb-0", className)}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 pb-0 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Start Your Story</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Share a memory, tell me about your family, or describe a moment that shaped who you are today.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                "My favorite childhood memory",
                "The person who influenced me most",
                "My favorite family member",
              ].map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setInput(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share a memory or story..."
            className="min-h-[44px] pt-2.5 max-h-[120px] resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="flex-shrink-0 h-[44px] w-[44px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </p>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEndSession}
              disabled={isLoading}
              className="text-xs h-7 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              New Session
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
