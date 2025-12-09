"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Phone,
  PhoneCall,
  Clock,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { callsApi, Call, chatApi, ChatSession } from "@/lib/api-client";
import { VoiceCall } from "@/components/voice-call";

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatCost(cents: number): string {
  if (!cents) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (days === 1) {
    return "Yesterday";
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: "long" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

const statusColors: Record<string, string> = {
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  "in-progress": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  initiated: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function CallsPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<Call[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalChats, setTotalChats] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("voice");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [callsRes, chatsRes] = await Promise.all([
      callsApi.list({ limit: 20 }),
      chatApi.getSessions(),
    ]);

    if (callsRes.data) {
      setCalls(callsRes.data.calls);
      setTotalCalls(callsRes.data.total);
    }
    if (chatsRes.data) {
      setChatSessions(chatsRes.data.sessions);
      setTotalChats(chatsRes.data.total);
    }
    setLoading(false);
  };

  const handleCallEnd = () => {
    setShowCallDialog(false);
    fetchData();
  };

  const totalDurationMins = Math.round(
    calls.reduce((sum, call) => sum + (call.duration_seconds || 0), 0) / 60
  );

  const totalSpentCents = calls.reduce(
    (sum, call) => sum + (call.cost_cents || 0),
    0
  );

  const thisMonthCalls = calls.filter((call) => {
    const callDate = new Date(call.started_at);
    const now = new Date();
    return (
      callDate.getMonth() === now.getMonth() &&
      callDate.getFullYear() === now.getFullYear()
    );
  }).length;

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">
            View your conversation history
          </p>
        </div>
        <Button onClick={() => setShowCallDialog(true)} size="lg">
          <PhoneCall className="mr-2 h-4 w-4" />
          Start Voice Call
        </Button>
      </div>

      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice Call</DialogTitle>
          </DialogHeader>
          <VoiceCall onCallEnd={handleCallEnd} />
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-4 flex-shrink-0">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Voice Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chat Sessions</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChats}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDurationMins} min</div>
            <p className="text-xs text-muted-foreground">Voice calls</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCost(totalSpentCents)}</div>
            <p className="text-xs text-muted-foreground">Voice calls</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex-shrink-0 pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="voice" className="gap-2">
                <Phone className="h-4 w-4" />
                Voice Calls ({totalCalls})
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat Sessions ({totalChats})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeTab === "voice" ? (
            calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Phone className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No voice calls yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Start your first voice conversation by clicking &quot;Start Voice Call&quot; above.
                </p>
                <Button className="mt-4" onClick={() => setShowCallDialog(true)}>
                  <PhoneCall className="mr-2 h-4 w-4" />
                  Make Your First Call
                </Button>
              </div>
            ) : (
              <div className="divide-y h-full overflow-y-auto overflow-x-hidden">
                {calls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center gap-4 py-4 hover:bg-muted/50 -mx-4 px-4 cursor-pointer transition-colors rounded-lg"
                    onClick={() => router.push(`/sessions/${call.id}`)}
                  >
                    <div
                      className={`flex-shrink-0 p-2.5 rounded-full ${
                        call.direction === "inbound" ? "bg-blue-500/10" : "bg-green-500/10"
                      }`}
                    >
                      {call.direction === "inbound" ? (
                        <ArrowDownLeft className="h-5 w-5 text-blue-500" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {call.direction === "inbound" ? "Incoming" : "Outgoing"} Call
                        </p>
                        <Badge variant="outline" className={`text-xs ${statusColors[call.status] || ""}`}>
                          {call.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{formatDate(call.started_at)}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="font-mono">{formatDuration(call.duration_seconds || 0)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground w-16">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-mono">{formatCost(call.cost_cents || 0).replace("$", "")}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            chatSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No chat sessions yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Start a conversation from the dashboard to share your stories via text.
                </p>
                <Button className="mt-4" variant="outline" onClick={() => router.push("/dashboard")}>
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="divide-y h-full overflow-y-auto overflow-x-hidden">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-4 py-4 hover:bg-muted/50 -mx-4 px-4 cursor-pointer transition-colors rounded-lg"
                    onClick={() => router.push(`/sessions/${session.id}`)}
                  >
                    <div className="flex-shrink-0 p-2.5 rounded-full bg-purple-500/10">
                      <MessageSquare className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Chat Session</p>
                        <Badge variant="outline" className={`text-xs ${statusColors[session.status] || ""}`}>
                          {session.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{formatDate(session.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span>{session.message_count} messages</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
