"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Heart, Send, CheckCircle, BookOpen } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { invitesApi, PublicInvite } from "@/lib/api-client";
import { toast } from "sonner";

export default function ContributePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [invite, setInvite] = useState<PublicInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [relationship, setRelationship] = useState("");

  useEffect(() => {
    const fetchInvite = async () => {
      const res = await invitesApi.getPublicInvite(code);
      if (res.data?.invite) {
        setInvite(res.data.invite);
        if (res.data.invite.guest_name) {
          setGuestName(res.data.invite.guest_name);
        }
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };

    fetchInvite();
  }, [code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!guestEmail.trim()) {
      toast.error("Please enter your email");
      return;
    }

    if (!content.trim()) {
      toast.error("Please write your story");
      return;
    }

    if (content.trim().length < 50) {
      toast.error("Your story should be at least 50 characters");
      return;
    }

    setSubmitting(true);

    const res = await invitesApi.submitStory(code, {
      guest_name: guestName,
      guest_email: guestEmail,
      title: title || undefined,
      content,
      relationship: relationship || undefined,
    });

    if (res.error) {
      toast.error(res.error);
    } else {
      setSubmitted(true);
      toast.success("Your story has been submitted!");
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invite Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This invite link may have expired or already been used.
            </p>
            <Button variant="outline" onClick={() => router.push("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-muted-foreground mb-4">
              Your story has been submitted to {invite?.owner_name}'s memoir. They'll review it soon.
            </p>
            <Button variant="outline" onClick={() => router.push("/")}>
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              Share a Story for {invite?.owner_name}'s Memoir
          </h1>
          <p className="text-muted-foreground">
            {invite?.message ||
              `${invite?.owner_name} would love to hear your memories and stories about them.`}
          </p>
        </div>

        {invite?.topic && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <p className="text-sm">
                <span className="font-medium">Suggested topic: </span>
                {invite.topic}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Your Story</CardTitle>
            <CardDescription>
              Share a memory, moment, or story that captures something special
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guest_name">Your Name *</Label>
                  <Input
                    id="guest_name"
                    placeholder="John Smith"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest_email">Your Email *</Label>
                  <Input
                    id="guest_email"
                    type="email"
                    placeholder="john@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship">Your Relationship (optional)</Label>
                <Input
                  id="relationship"
                  placeholder="e.g., Childhood friend, Sister, Coworker"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Story Title (optional)</Label>
                <Input
                  id="title"
                  placeholder="e.g., The Summer Road Trip"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Your Story *</Label>
                <Textarea
                  id="content"
                  placeholder="Write your memory or story here... Be as detailed as you'd like. What happened? Who was there? How did it make you feel?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  required
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {content.length} characters (minimum 50)
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Story
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your story will be reviewed by {invite?.owner_name} before being added to their memoir.
        </p>
        </div>
      </div>
    </>
  );
}
