"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, PhoneCall, PhoneOff, Clock, Loader2 } from "lucide-react";

export default function CallsPage() {
  const [initiatingCall, setInitiatingCall] = useState(false);

  const handleInitiateCall = async () => {
    setInitiatingCall(true);
    // TODO: Implement call initiation
    setTimeout(() => setInitiatingCall(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calls</h1>
          <p className="text-muted-foreground">
            View your call history and start new conversations
          </p>
        </div>
        <Button onClick={handleInitiateCall} disabled={initiatingCall}>
          {initiatingCall ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calling...
            </>
          ) : (
            <>
              <PhoneCall className="mr-2 h-4 w-4" />
              Call Me Now
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 min</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <PhoneOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Calls made</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>
            Your recent conversations with the AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Phone className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No calls yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Start a conversation by clicking &quot;Call Me Now&quot; above
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
