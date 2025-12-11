"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Link as LinkIcon,
  Copy,
  Check,
  Trash2,
  Mail,
  Clock,
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { invitesApi, StoryInvite, GuestStory, memoirApi, MemoirChapter } from "@/lib/api-client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function InvitesPage() {
  const [invites, setInvites] = useState<StoryInvite[]>([]);
  const [pendingStories, setPendingStories] = useState<GuestStory[]>([]);
  const [chapters, setChapters] = useState<MemoirChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [invitesRes, storiesRes, chaptersRes] = await Promise.all([
      invitesApi.list(),
      invitesApi.getPendingStories(),
      memoirApi.getChapters(),
    ]);

    if (invitesRes.data) setInvites(invitesRes.data.invites);
    if (storiesRes.data) setPendingStories(storiesRes.data.stories);
    if (chaptersRes.data) setChapters(chaptersRes.data.chapters);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateInvite = async () => {
    if (!guestEmail.trim()) {
      toast.error("Guest email is required");
      return;
    }

    setCreating(true);
    const res = await invitesApi.create({
      guest_email: guestEmail,
      guest_name: guestName || undefined,
      topic: topic || undefined,
      message: message || undefined,
    });

    if (res.error) {
      toast.error(res.error);
    } else if (res.data) {
      toast.success("Invite created successfully");
      setInvites((prev) => [res.data!.invite, ...prev]);
      setCreateDialogOpen(false);
      // Reset form
      setGuestEmail("");
      setGuestName("");
      setTopic("");
      setMessage("");
      // Copy link to clipboard
      await navigator.clipboard.writeText(res.data.invite_url);
      toast.success("Invite link copied to clipboard!");
    }

    setCreating(false);
  };

  const handleCopyLink = async (invite: StoryInvite) => {
    const url = `${window.location.origin}/contribute/${invite.invite_code}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteInvite = async (inviteId: string) => {
    const res = await invitesApi.delete(inviteId);
    if (res.data?.success) {
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      toast.success("Invite deleted");
    } else {
      toast.error("Failed to delete invite");
    }
  };

  const handleApproveStory = async (storyId: string, chapterId?: string) => {
    const res = await invitesApi.approveStory(storyId, chapterId);
    if (res.data) {
      setPendingStories((prev) => prev.filter((s) => s.id !== storyId));
      toast.success("Story approved and added to your memoir");
    } else {
      toast.error("Failed to approve story");
    }
  };

  const handleRejectStory = async (storyId: string) => {
    const res = await invitesApi.rejectStory(storyId);
    if (res.data?.success) {
      setPendingStories((prev) => prev.filter((s) => s.id !== storyId));
      toast.success("Story rejected");
    } else {
      toast.error("Failed to reject story");
    }
  };

  const getStatusBadge = (status: StoryInvite["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "viewed":
        return <Badge variant="outline">Viewed</Badge>;
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Story Invites</h1>
          <p className="text-muted-foreground">
            Invite friends and family to contribute stories to your memoir
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Story Invite</DialogTitle>
              <DialogDescription>
                Send a unique link to someone who can contribute a story about you
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="guest_email">Guest Email *</Label>
                <Input
                  id="guest_email"
                  type="email"
                  placeholder="friend@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guest_name">Guest Name (optional)</Label>
                <Input
                  id="guest_name"
                  placeholder="John"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic">Suggested Topic (optional)</Label>
                <Input
                  id="topic"
                  placeholder="e.g., A memory from college"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Hey! I'd love it if you could share a story..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvite} disabled={creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LinkIcon className="h-4 w-4 mr-2" />
                )}
                Create & Copy Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="invites">
        <TabsList>
          <TabsTrigger value="invites">
            <LinkIcon className="h-4 w-4 mr-2" />
            Invites ({invites.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            <MessageSquare className="h-4 w-4 mr-2" />
            Pending Stories ({pendingStories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invites" className="mt-4">
          {invites.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No invites yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first invite to let friends and family contribute stories
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invite
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {invites.map((invite) => (
                <Card key={invite.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{invite.guest_email}</span>
                          {invite.guest_name && (
                            <span className="text-muted-foreground">
                              ({invite.guest_name})
                            </span>
                          )}
                          {getStatusBadge(invite.status)}
                        </div>
                        {invite.topic && (
                          <p className="text-sm text-muted-foreground">
                            Topic: {invite.topic}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(invite.created_at), {
                              addSuffix: true,
                            })}
                          </span>
                          <span>
                            Used {invite.use_count}/{invite.max_uses}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(invite)}
                        >
                          {copiedId === invite.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvite(invite.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          {pendingStories.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No pending stories</h3>
                <p className="text-muted-foreground text-center">
                  Stories submitted by your friends and family will appear here for review
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingStories.map((story) => (
                <Card key={story.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {story.title || "Untitled Story"}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <User className="h-3 w-3" />
                          {story.guest_name}
                          {story.relationship && (
                            <span className="text-muted-foreground">
                              ({story.relationship})
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(story.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
                      {story.content.length > 300
                        ? story.content.substring(0, 300) + "..."
                        : story.content}
                    </p>
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(chapterId) =>
                          handleApproveStory(story.id, chapterId)
                        }
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Approve to chapter..." />
                        </SelectTrigger>
                        <SelectContent>
                          {chapters.map((chapter) => (
                            <SelectItem key={chapter.id} value={chapter.id}>
                              {chapter.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproveStory(story.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve (Auto-assign)
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRejectStory(story.id)}
                      >
                        <XCircle className="h-4 w-4 mr-1 text-destructive" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
