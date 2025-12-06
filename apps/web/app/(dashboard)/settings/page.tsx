"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, Plus, Trash2, CheckCircle, Star } from "lucide-react";
import { profileApi, userPhonesApi, Profile, UserPhone } from "@/lib/api-client";
import { toast } from "sonner";
import { CountrySelector, countries, Country } from "@/components/ui/country-selector";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phones, setPhones] = useState<UserPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");

  // Phone verification state
  const [newPhone, setNewPhone] = useState("");
  const [addingPhone, setAddingPhone] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [verifyingPhoneId, setVerifyingPhoneId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profileRes, phonesRes] = await Promise.all([
      profileApi.get(),
      userPhonesApi.list(),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
      setFullName(profileRes.data.full_name || "");
      setPreferredName(profileRes.data.preferred_name || "");
      setEmail(profileRes.data.email || "");
    }

    if (phonesRes.data) {
      setPhones(phonesRes.data.phones);
    }

    setLoading(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const res = await profileApi.update({
      full_name: fullName,
      preferred_name: preferredName,
      email: email,
    });
    if (res.data) {
      setProfile(res.data);
      toast.success("Profile updated successfully");
    } else {
      toast.error(res.error || "Failed to update profile");
    }
    setSaving(false);
  };

  const toE164 = (dialCode: string, phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return `${dialCode}${digits}`;
  };

  const handleAddPhone = async () => {
    if (!newPhone.trim()) return;

    const e164Phone = toE164(selectedCountry.dialCode, newPhone);
    setAddingPhone(true);
    const res = await userPhonesApi.add(e164Phone);

    if (res.data?.success && res.data.phone) {
      setPhones([...phones, res.data.phone]);
      setNewPhone("");
      toast.success("Phone number added. Please verify it.");
      // Auto-send verification code
      handleSendCode(res.data.phone.id);
    } else {
      toast.error(res.data?.error || res.error || "Failed to add phone");
    }
    setAddingPhone(false);
  };

  const handleSendCode = async (phoneId: string) => {
    setSendingCode(true);
    const res = await userPhonesApi.sendCode(phoneId);

    if (res.data?.success) {
      setVerifyingPhoneId(phoneId);
      toast.success("Verification code sent!");
    } else {
      toast.error(res.data?.error || res.error || "Failed to send code");
    }
    setSendingCode(false);
  };

  const handleVerifyCode = async () => {
    if (!verifyingPhoneId || !verificationCode.trim()) return;

    const res = await userPhonesApi.verify(verifyingPhoneId, verificationCode);

    if (res.data?.success) {
      toast.success("Phone verified successfully!");
      setVerifyingPhoneId(null);
      setVerificationCode("");
      fetchData(); // Refresh phones list
    } else {
      toast.error(res.data?.error || res.error || "Invalid code");
    }
  };

  const handleSetPrimary = async (phoneId: string) => {
    const res = await userPhonesApi.setPrimary(phoneId);

    if (res.data?.success) {
      toast.success("Primary phone updated");
      fetchData();
    } else {
      toast.error(res.data?.error || res.error || "Failed to set primary");
    }
  };

  const handleDeletePhone = async (phoneId: string) => {
    const res = await userPhonesApi.delete(phoneId);

    if (res.data?.success) {
      setPhones(phones.filter((p) => p.id !== phoneId));
      toast.success("Phone removed");
    } else {
      toast.error(res.data?.error || res.error || "Failed to remove phone");
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredName">Preferred Name</Label>
              <Input
                id="preferredName"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="How should AI call you?"
              />
              <p className="text-xs text-muted-foreground">
                This is how the AI assistant will address you
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Phone Numbers
          </CardTitle>
          <CardDescription>
            Manage phone numbers for receiving calls from the AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing phones */}
          {phones.length > 0 && (
            <div className="space-y-3">
              {phones.map((phone) => (
                <div
                  key={phone.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{phone.phone_number}</span>
                    <div className="flex gap-2">
                      {phone.is_verified ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unverified</Badge>
                      )}
                      {phone.is_primary && (
                        <Badge variant="outline" className="gap-1">
                          <Star className="h-3 w-3" />
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!phone.is_verified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendCode(phone.id)}
                        disabled={sendingCode}
                      >
                        {sendingCode ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    )}
                    {phone.is_verified && !phone.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(phone.id)}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePhone(phone.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Verification code input */}
          {verifyingPhoneId && (
            <div className="rounded-lg border border-primary/50 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-medium">
                Enter the verification code sent to your phone
              </p>
              <div className="flex gap-2">
                <Input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="6-digit code"
                  maxLength={6}
                  className="max-w-[150px] font-mono text-center text-lg tracking-widest"
                />
                <Button onClick={handleVerifyCode}>Verify</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setVerifyingPhoneId(null);
                    setVerificationCode("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Add new phone */}
          <div className="flex gap-2">
            <CountrySelector
              value={selectedCountry}
              onChange={setSelectedCountry}
            />
            <Input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="555 123 4567"
              className="max-w-[180px]"
            />
            <Button
              onClick={handleAddPhone}
              disabled={addingPhone || !newPhone.trim()}
            >
              {addingPhone ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Phone
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add a phone number to receive calls from the AI assistant.
            You&apos;ll need to verify it with a code.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
