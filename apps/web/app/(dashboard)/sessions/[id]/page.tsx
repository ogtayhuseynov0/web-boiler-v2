"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  Phone,
  User,
  Loader2,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  BookOpen,
  FileText,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { callsApi, Call, ConversationMessage, memoirApi, ChapterStory } from "@/lib/api-client";

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusColors: Record<string, string> = {
  completed: "bg-green-500/10 text-green-500",
  "in-progress": "bg-blue-500/10 text-blue-500",
  initiated: "bg-yellow-500/10 text-yellow-500",
  failed: "bg-red-500/10 text-red-500",
};

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [call, setCall] = useState<Call | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [stories, setStories] = useState<ChapterStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isChat = call?.caller_phone === "text_chat";

  useEffect(() => {
    fetchDetails();
  }, [sessionId]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);

    const [callRes, storiesRes] = await Promise.all([
      callsApi.get(sessionId),
      memoirApi.getStoriesBySource(sessionId),
    ]);

    if (callRes.error) {
      setError(callRes.error);
      setLoading(false);
      return;
    }

    if (callRes.data) {
      setCall(callRes.data.call);
      setMessages(callRes.data.messages || []);
    }

    if (storiesRes.data) {
      setStories(storiesRes.data.stories || []);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sessions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Session Not Found</h1>
            <p className="text-muted-foreground">{error || "This session does not exist"}</p>
          </div>
        </div>
      </div>
    );
  }

  const conversationMessages = messages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/sessions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {isChat ? "Chat Session" : `${call.direction === "inbound" ? "Incoming" : "Outgoing"} Call`}
            </h1>
            <Badge className={statusColors[call.status] || statusColors.completed}>
              {call.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateTime(call.started_at)}
          </p>
        </div>
      </div>

      {/* Stats - different for chat vs call */}
      {isChat ? (
        <div className="grid gap-4 sm:grid-cols-2 flex-shrink-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversationMessages.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Stories Extracted</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stories.length}</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-4 flex-shrink-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {formatDuration(call.duration_seconds || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Direction</CardTitle>
              {call.direction === "inbound" ? (
                <ArrowDownLeft className="h-4 w-4 text-blue-500" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{call.direction}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCost(call.cost_cents || 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversationMessages.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Extracted Stories Section */}
      {stories.length > 0 && (
        <Card className="flex-shrink-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Extracted Stories
                </CardTitle>
                <CardDescription>
                  {stories.length} {stories.length === 1 ? "story" : "stories"} captured from this {isChat ? "chat" : "call"}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/chapters">
                  <BookOpen className="h-4 w-4 mr-2" />
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="p-4 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className="font-medium">{story.title || "Untitled Story"}</h4>
                    {story.time_period && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {story.time_period}
                      </Badge>
                    )}
                  </div>
                  {story.summary && (
                    <p className="text-sm text-muted-foreground mb-2">{story.summary}</p>
                  )}
                  <p className="text-sm line-clamp-3">{story.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversation */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex-shrink-0">
          <CardTitle>Conversation</CardTitle>
          <CardDescription>
            {isChat ? "Full chat history" : "Full transcript of the call"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          {conversationMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {isChat ? (
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
              ) : (
                <Phone className="h-12 w-12 text-muted-foreground/50 mb-4" />
              )}
              <h3 className="text-lg font-medium">No messages yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {call.status === "in-progress"
                  ? "Messages will appear as the conversation continues"
                  : "No messages were recorded for this session"}
              </p>
            </div>
          ) : (
            <div className="space-y-4 h-full overflow-y-auto pr-2">
              {conversationMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
