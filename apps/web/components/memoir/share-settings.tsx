"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Share2, Copy, Check, Globe, Lock, ExternalLink, Loader2 } from "lucide-react";
import { profileApi, MemoirSharingSettings } from "@/lib/api-client";
import { toast } from "sonner";

interface ShareSettingsProps {
  initialSettings?: MemoirSharingSettings | null;
}

export function ShareSettings({ initialSettings }: ShareSettingsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(!initialSettings);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<MemoirSharingSettings>({
    is_memoir_public: false,
    memoir_share_slug: null,
    memoir_title: null,
    memoir_description: null,
  });
  const [slugInput, setSlugInput] = useState("");
  const [slugError, setSlugError] = useState("");

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      setSlugInput(initialSettings.memoir_share_slug || "");
      setLoading(false);
    } else if (open) {
      loadSettings();
    }
  }, [open, initialSettings]);

  const loadSettings = async () => {
    setLoading(true);
    const res = await profileApi.getSharingSettings();
    if (res.data) {
      setSettings(res.data);
      setSlugInput(res.data.memoir_share_slug || "");
    }
    setLoading(false);
  };

  const handleTogglePublic = async (checked: boolean) => {
    setSaving(true);
    const res = await profileApi.updateSharingSettings({ is_memoir_public: checked });
    if (res.data) {
      setSettings(res.data);
      setSlugInput(res.data.memoir_share_slug || "");
      toast.success(checked ? "Memoir is now public" : "Memoir is now private");
    } else {
      toast.error(res.error || "Failed to update settings");
    }
    setSaving(false);
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    const res = await profileApi.updateSharingSettings({
      memoir_title: settings.memoir_title || undefined,
      memoir_description: settings.memoir_description || undefined,
    });
    if (res.data) {
      setSettings(res.data);
      toast.success("Settings saved");
    } else {
      toast.error(res.error || "Failed to save");
    }
    setSaving(false);
  };

  const handleUpdateSlug = async () => {
    if (!slugInput || slugInput.length < 3) {
      setSlugError("URL must be at least 3 characters");
      return;
    }
    setSlugError("");
    setSaving(true);
    const res = await profileApi.updateShareSlug(slugInput);
    if (res.data) {
      setSettings((prev) => ({ ...prev, memoir_share_slug: res.data!.slug }));
      setSlugInput(res.data.slug);
      toast.success("URL updated");
    } else {
      setSlugError(res.error || "Failed to update URL");
    }
    setSaving(false);
  };

  const shareUrl = settings.memoir_share_slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/m/${settings.memoir_share_slug}`
    : "";

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Memoir</DialogTitle>
          <DialogDescription>
            Make your memoir public to share it with others
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Public Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.is_memoir_public ? (
                  <Globe className="h-5 w-5 text-green-500" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {settings.is_memoir_public ? "Public" : "Private"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {settings.is_memoir_public
                      ? "Anyone with the link can view"
                      : "Only you can see your memoir"}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.is_memoir_public}
                onCheckedChange={handleTogglePublic}
                disabled={saving}
              />
            </div>

            {/* Share URL */}
            {settings.is_memoir_public && settings.memoir_share_slug && (
              <>
                <div className="space-y-2">
                  <Label>Share Link</Label>
                  <div className="flex gap-2">
                    <Input value={shareUrl} readOnly className="flex-1" />
                    <Button variant="outline" size="icon" onClick={handleCopy}>
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" size="icon" asChild>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Custom URL */}
                <div className="space-y-2">
                  <Label>Custom URL</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-muted px-3 rounded-l-md border border-r-0">
                      <span className="text-sm text-muted-foreground">memoir.bot/m/</span>
                    </div>
                    <Input
                      value={slugInput}
                      onChange={(e) => {
                        setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                        setSlugError("");
                      }}
                      className="flex-1 rounded-l-none"
                      placeholder="your-name"
                    />
                    <Button
                      variant="outline"
                      onClick={handleUpdateSlug}
                      disabled={saving || slugInput === settings.memoir_share_slug}
                    >
                      Save
                    </Button>
                  </div>
                  {slugError && <p className="text-sm text-destructive">{slugError}</p>}
                </div>

                {/* Title & Description */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Public Title</Label>
                    <Input
                      value={settings.memoir_title || ""}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, memoir_title: e.target.value }))
                      }
                      placeholder="My Life Story"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={settings.memoir_description || ""}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, memoir_description: e.target.value }))
                      }
                      placeholder="A brief description of your memoir..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleSaveDetails} disabled={saving} className="w-full">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Details
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
