"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { invitesApi } from "@/lib/api-client";
import { toast } from "sonner";
import { Conversation } from "@elevenlabs/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface GuestVoiceCallProps {
  inviteCode: string;
  ownerName: string;
  guestName: string;
  topic?: string;
  onStoryCreated?: () => void;
}

export function GuestVoiceCall({
  inviteCode,
  ownerName,
  guestName,
  topic,
  onStoryCreated,
}: GuestVoiceCallProps) {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "disconnected" | "saving"
  >("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [mode, setMode] = useState<"listening" | "speaking">("listening");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);

  const conversationRef = useRef<Conversation | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Duration timer
  useEffect(() => {
    if (status === "connected" && !durationIntervalRef.current) {
      startTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [status]);

  // Volume monitoring
  useEffect(() => {
    if (status === "connected" && conversationRef.current) {
      volumeIntervalRef.current = setInterval(async () => {
        if (conversationRef.current) {
          try {
            const input = await conversationRef.current.getInputVolume();
            const output = await conversationRef.current.getOutputVolume();
            setInputVolume(input);
            setOutputVolume(output);
          } catch {
            // Ignore errors
          }
        }
      }, 100);
    }

    return () => {
      if (volumeIntervalRef.current) {
        clearInterval(volumeIntervalRef.current);
        volumeIntervalRef.current = null;
      }
    };
  }, [status]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startCall = useCallback(async () => {
    try {
      setStatus("connecting");

      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start voice session from backend
      const response = await invitesApi.startVoiceSession(inviteCode);

      if (response.error || !response.data?.token) {
        toast.error(response.error || "Failed to start voice session");
        setStatus("idle");
        return;
      }

      const { token, session_id, context } = response.data;
      setSessionId(session_id);

      // Start ElevenLabs conversation
      const conversation = await Conversation.startSession({
        conversationToken: token,
        connectionType: "webrtc",
        onConnect: () => {
          setStatus("connected");
          toast.success("Connected! Start sharing your story.");
        },
        onDisconnect: () => {
          setStatus("disconnected");
        },
        onMessage: (message: { source?: string; message?: string }) => {
          if (message.source && message.message) {
            const role = message.source === "user" ? "user" : "assistant";
            const newMessage: Message = {
              role,
              content: message.message,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, newMessage]);

            // Store message in backend
            if (session_id) {
              invitesApi.storeVoiceMessage(inviteCode, session_id, role, message.message);
            }
          }
        },
        onError: (error) => {
          console.error("Conversation error:", error);
          toast.error("Connection error occurred");
        },
        onModeChange: (newMode: { mode: string }) => {
          setMode(newMode.mode === "speaking" ? "speaking" : "listening");
        },
      });

      conversationRef.current = conversation;

      // Send context update with guest info
      if (context) {
        const contextMessage = topic
          ? `You are interviewing ${context.guest_name} to collect stories about ${context.owner_name} for their memoir. The suggested topic is: "${topic}". Ask warm, engaging questions to draw out their memories. Start by greeting them and asking about their relationship with ${context.owner_name}.`
          : `You are interviewing ${context.guest_name} to collect stories about ${context.owner_name} for their memoir. Ask warm, engaging questions to draw out their memories. Start by greeting them and asking about their relationship with ${context.owner_name}.`;

        conversation.sendContextualUpdate(contextMessage);
      }
    } catch (error) {
      console.error("Failed to start call:", error);
      toast.error("Failed to start call. Please check microphone permissions.");
      setStatus("idle");
    }
  }, [inviteCode, topic]);

  const endCall = useCallback(async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }

    setStatus("idle");
    setDuration(0);
    startTimeRef.current = null;
  }, []);

  const saveStory = useCallback(async () => {
    if (!sessionId || messages.length < 2) {
      toast.error("Please have a longer conversation before saving");
      return;
    }

    setStatus("saving");

    const res = await invitesApi.endVoiceAndSaveStory(inviteCode, sessionId, guestName);

    if (res.data?.success) {
      toast.success(res.data.message);
      onStoryCreated?.();
    } else {
      toast.error("Failed to save story");
      setStatus("disconnected");
    }
  }, [inviteCode, sessionId, guestName, messages.length, onStoryCreated]);

  const toggleMute = useCallback(() => {
    if (conversationRef.current) {
      conversationRef.current.setMicMuted(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const toggleSpeaker = useCallback(async () => {
    if (conversationRef.current) {
      await conversationRef.current.setVolume({ volume: isSpeakerOn ? 0 : 1 });
      setIsSpeakerOn(!isSpeakerOn);
    }
  }, [isSpeakerOn]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Status indicator */}
      <div className="text-center mb-6">
        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 transition-all ${
            status === "connected"
              ? mode === "speaking"
                ? "bg-green-500/20 ring-4 ring-green-500/50"
                : "bg-blue-500/20 ring-4 ring-blue-500/50"
              : status === "connecting" || status === "saving"
                ? "bg-yellow-500/20 animate-pulse"
                : "bg-muted"
          }`}
        >
          {status === "connecting" || status === "saving" ? (
            <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
          ) : status === "connected" ? (
            <div className="relative">
              <Phone className="w-12 h-12 text-green-500" />
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(outputVolume * 100, 100)}%`, maxWidth: "48px" }}
              />
            </div>
          ) : (
            <Phone className="w-12 h-12 text-muted-foreground" />
          )}
        </div>

        <h3 className="text-lg font-semibold">
          {status === "idle" && "Ready to share your story"}
          {status === "connecting" && "Connecting..."}
          {status === "connected" &&
            (mode === "speaking" ? "AI Speaking..." : "Listening...")}
          {status === "disconnected" && "Call ended"}
          {status === "saving" && "Saving your story..."}
        </h3>

        {status === "connected" && (
          <p className="text-2xl font-mono text-muted-foreground mt-2">
            {formatDuration(duration)}
          </p>
        )}

        <p className="text-sm text-muted-foreground mt-2">
          Share your memories about {ownerName}
          {topic && ` - Topic: "${topic}"`}
        </p>
      </div>

      {/* Conversation messages */}
      {messages.length > 0 && (
        <div className="mb-6 max-h-48 overflow-y-auto border rounded-lg p-3 bg-muted/30">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-2 last:mb-0 ${
                msg.role === "user" ? "text-right" : "text-left"
              }`}
            >
              <span
                className={`inline-block px-3 py-1.5 rounded-lg text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {status === "idle" ? (
          <Button
            size="lg"
            className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
            onClick={startCall}
          >
            <Phone className="w-6 h-6" />
          </Button>
        ) : status === "connecting" || status === "saving" ? (
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-16 h-16"
            disabled
          >
            <Loader2 className="w-6 h-6 animate-spin" />
          </Button>
        ) : status === "connected" ? (
          <>
            <Button
              size="lg"
              variant={isMuted ? "destructive" : "secondary"}
              className="rounded-full w-12 h-12"
              onClick={toggleMute}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>

            <Button
              size="lg"
              variant="destructive"
              className="rounded-full w-16 h-16"
              onClick={endCall}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>

            <Button
              size="lg"
              variant={isSpeakerOn ? "secondary" : "outline"}
              className="rounded-full w-12 h-12"
              onClick={toggleSpeaker}
            >
              {isSpeakerOn ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-4">
              <Button
                size="lg"
                className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600"
                onClick={startCall}
              >
                <Phone className="w-6 h-6" />
              </Button>
            </div>
            {messages.length >= 2 && (
              <Button
                onClick={saveStory}
                variant="default"
                className="w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Story & Submit for Review
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Mic volume indicator when connected */}
      {status === "connected" && (
        <div className="mt-4 flex items-center gap-2 justify-center">
          <Mic className="w-4 h-4 text-muted-foreground" />
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-75"
              style={{ width: `${Math.min(inputVolume * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Save story button when connected */}
      {status === "connected" && messages.length >= 2 && (
        <div className="mt-6">
          <Button
            onClick={async () => {
              await endCall();
              await saveStory();
            }}
            variant="outline"
            className="w-full"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            End Call & Save Story
          </Button>
        </div>
      )}

      {status === "connected" && messages.length < 2 && (
        <p className="text-xs text-center text-muted-foreground mt-4">
          Continue the conversation to share your story. When done, you can save and submit it.
        </p>
      )}
    </div>
  );
}
