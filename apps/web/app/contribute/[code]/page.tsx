"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, Send, CheckCircle, BookOpen, LogIn, AlertCircle, Pencil } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { invitesApi, PublicInvite, GuestInviteWithStory } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import Link from "next/link";

export default function ContributePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [invite, setInvite] = useState<PublicInvite | null>(null);
  const [guestData, setGuestData] = useState<GuestInviteWithStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [emailMismatch, setEmailMismatch] = useState(false);

  // Form state
  const [guestName, setGuestName] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [relationship, setRelationship] = useState("");

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  // Fetch invite data based on auth status
  const fetchData = useCallback(async () => {
    if (authLoading) return;

    setLoading(true);

    if (user) {
      // Authenticated - try to get guest invite with story
      const res = await invitesApi.getGuestInvite(code);
      if (res.data) {
        setGuestData(res.data);
        setInvite(res.data.invite);
        // Pre-fill form with existing story data
        if (res.data.story) {
          setGuestName(res.data.story.guest_name);
          setTitle(res.data.story.title || "");
          setContent(res.data.story.content);
          setRelationship(res.data.story.relationship || "");
        } else if (res.data.invite.guest_name) {
          setGuestName(res.data.invite.guest_name);
        }
      } else if (res.error?.includes("mismatch") || res.error?.includes("NOT_FOUND")) {
        // Email doesn't match - check if invite exists at all
        const publicRes = await invitesApi.getPublicInvite(code);
        if (publicRes.data) {
          setInvite(publicRes.data.invite);
          setEmailMismatch(true);
        } else {
          setNotFound(true);
        }
      } else {
        setNotFound(true);
      }
    } else {
      // Not authenticated - get public invite info
      const res = await invitesApi.getPublicInvite(code);
      if (res.data?.invite) {
        setInvite(res.data.invite);
      } else {
        setNotFound(true);
      }
    }

    setLoading(false);
  }, [code, user, authLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim()) {
      toast.error("Please enter your name");
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

    const res = await invitesApi.updateGuestStory(code, {
      guest_name: guestName,
      title: title || undefined,
      content,
      relationship: relationship || undefined,
    });

    if (res.error) {
      toast.error(res.error);
    } else if (res.data) {
      setSubmitted(true);
      toast.success(res.data.message);
    }

    setSubmitting(false);
  };

  const isEditing = guestData?.story !== null;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Invite Not Found</h2>
              <p className="text-muted-foreground mb-4">
                This invite link may have expired or is invalid.
              </p>
              <Button variant="outline" onClick={() => router.push("/")}>
                Go Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Not logged in - show login prompt
  if (!user) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Share a Story for {invite?.owner_name}'s Memoir</CardTitle>
              <CardDescription>
                {invite?.message || "You've been invited to share a memory or story."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {invite?.topic && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm">
                    <span className="font-medium">Suggested topic: </span>
                    {invite.topic}
                  </p>
                </div>
              )}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-3">
                  <LogIn className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Sign in to continue</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You need to sign in with the email this invite was sent to. This allows you to edit your story anytime.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild>
                  <Link href={`/login?redirect=/contribute/${code}`}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/signup?redirect=/contribute/${code}`}>
                    Create Account
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Email mismatch
  if (emailMismatch) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-center">Email Mismatch</h2>
              <p className="text-muted-foreground text-center mb-4">
                This invite was sent to a different email address. Please sign in with the correct email to contribute.
              </p>
              <p className="text-sm text-center text-muted-foreground mb-4">
                Currently signed in as: <span className="font-medium">{user.email}</span>
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    router.refresh();
                  }}
                >
                  Sign Out & Use Different Account
                </Button>
                <Button variant="ghost" onClick={() => router.push("/")}>
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-6">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {isEditing ? "Story Updated!" : "Thank You!"}
              </h2>
              <p className="text-muted-foreground mb-4">
                {isEditing
                  ? `Your story has been updated and is pending re-approval from ${invite?.owner_name}.`
                  : `Your story has been submitted to ${invite?.owner_name}'s memoir. They'll review it soon.`}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                You can return to this page anytime to edit your story.
              </p>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
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
              {isEditing ? "Edit Your Story" : "Share a Story"} for {invite?.owner_name}'s Memoir
            </h1>
            <p className="text-muted-foreground">
              {invite?.message ||
                `${invite?.owner_name} would love to hear your memories and stories about them.`}
            </p>
          </div>

          {guestData?.story && (
            <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
              <CardContent className="py-4">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Editing your story (v{guestData.story.version})
                  </span>
                  {guestData.story.is_approved ? (
                    <Badge variant="secondary" className="ml-auto">Approved</Badge>
                  ) : (
                    <Badge variant="outline" className="ml-auto">Pending Approval</Badge>
                  )}
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Changes will require re-approval before appearing in the memoir.
                </p>
              </CardContent>
            </Card>
          )}

          {invite?.topic && !isEditing && (
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
              <CardTitle>{isEditing ? "Update Your Story" : "Your Story"}</CardTitle>
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
                    <Label htmlFor="guest_email">Your Email</Label>
                    <Input
                      id="guest_email"
                      type="email"
                      value={user.email || ""}
                      disabled
                      className="bg-muted"
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
                  {isEditing ? "Update Story" : "Submit Story"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            {isEditing
              ? "Your changes will be reviewed before appearing in the memoir."
              : `Your story will be reviewed by ${invite?.owner_name} before being added to their memoir.`}
          </p>
        </div>
      </div>
    </>
  );
}
