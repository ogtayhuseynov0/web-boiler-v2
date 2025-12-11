"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  BookOpen,
  Clock,
  User,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { invitesApi } from "@/lib/api-client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Submission {
  id: string;
  guest_name: string;
  title: string | null;
  content: string;
  relationship: string | null;
  is_approved: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  invite: {
    invite_code: string;
    owner_name: string;
    topic: string | null;
  };
}

export default function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSubmission, setEditingSubmission] = useState<Submission | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editRelationship, setEditRelationship] = useState("");

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    const res = await invitesApi.getMySubmissions();
    if (res.data) {
      setSubmissions(res.data.submissions);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleEdit = (submission: Submission) => {
    setEditingSubmission(submission);
    setEditTitle(submission.title || "");
    setEditContent(submission.content);
    setEditRelationship(submission.relationship || "");
  };

  const handleSaveEdit = async () => {
    if (!editingSubmission) return;

    if (editContent.trim().length < 50) {
      toast.error("Story must be at least 50 characters");
      return;
    }

    setSaving(true);
    const res = await invitesApi.updateMySubmission(editingSubmission.id, {
      title: editTitle || undefined,
      content: editContent,
      relationship: editRelationship || undefined,
    });

    if (res.error) {
      toast.error(res.error);
    } else if (res.data?.success) {
      toast.success(res.data.message);
      setEditingSubmission(null);
      fetchSubmissions();
    }

    setSaving(false);
  };

  const getStatusBadge = (submission: Submission) => {
    if (submission.is_approved) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    }
    if (submission.version > 1) {
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pending Re-approval
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Pending Review
      </Badge>
    );
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
      <div>
        <h1 className="text-3xl font-bold">My Story Submissions</h1>
        <p className="text-muted-foreground">
          Stories you&apos;ve contributed to others&apos; memoirs
        </p>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              When you contribute stories to others&apos; memoirs via invite
              links, they&apos;ll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {submission.title || "Untitled Story"}
                      {getStatusBadge(submission)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <span className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Story for {submission.invite.owner_name}
                        {submission.invite.topic && (
                          <span className="text-muted-foreground">
                            &bull; Topic: {submission.invite.topic}
                          </span>
                        )}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {submission.version > 1 && `v${submission.version} • `}
                      {formatDistanceToNow(new Date(submission.updated_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
                  {submission.content.length > 300
                    ? submission.content.substring(0, 300) + "..."
                    : submission.content}
                </p>
                {submission.relationship && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Relationship: {submission.relationship}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(submission)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Story
                  </Button>
                  {submission.is_approved && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Included in {submission.invite.owner_name}&apos;s memoir
                    </span>
                  )}
                  {!submission.is_approved && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Waiting for {submission.invite.owner_name} to review
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingSubmission}
        onOpenChange={(open) => !open && setEditingSubmission(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Your Story</DialogTitle>
            <DialogDescription>
              Update your story submission for {editingSubmission?.invite.owner_name}.
              {editingSubmission?.is_approved && (
                <span className="text-yellow-600 block mt-1">
                  Note: This story has been approved. Editing will require re-approval.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_title">Title (optional)</Label>
              <Input
                id="edit_title"
                placeholder="Give your story a title..."
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_content">Your Story *</Label>
              <Textarea
                id="edit_content"
                placeholder="Share your memory or story..."
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {editContent.length} characters (minimum 50)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_relationship">
                Your Relationship (optional)
              </Label>
              <Input
                id="edit_relationship"
                placeholder="e.g., College friend, Cousin, Coworker"
                value={editRelationship}
                onChange={(e) => setEditRelationship(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingSubmission(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
