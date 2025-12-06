"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowLeft, Phone, KeyRound } from "lucide-react";
import { CountrySelector, countries, Country } from "@/components/ui/country-selector";

type Step = "phone" | "otp";

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function toE164(dialCode: string, phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${dialCode}${digits}`;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [step, setStep] = useState<Step>("phone");
  const [country, setCountry] = useState<Country>(countries[0]); // Default to US
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) {
      setError("Please enter a valid phone number");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const e164Phone = toE164(country.dialCode, phone);

    const { error } = await supabase.auth.signInWithOtp({
      phone: e164Phone,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setStep("otp");
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit code");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const e164Phone = toE164(country.dialCode, phone);

    const { error } = await supabase.auth.verifyOtp({
      phone: e164Phone,
      token: otp,
      type: "sms",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  const handleResendOtp = async () => {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const e164Phone = toE164(country.dialCode, phone);

    const { error } = await supabase.auth.signInWithOtp({
      phone: e164Phone,
    });

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-8 shadow-xl shadow-black/5 dark:border-border/50 dark:bg-card/80 dark:shadow-black/10">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
            {step === "phone" ? (
              <Phone className="h-7 w-7 text-primary" />
            ) : (
              <KeyRound className="h-7 w-7 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold">
            {step === "phone" ? "Welcome to Ringy" : "Enter verification code"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {step === "phone" ? (
              "Sign in with your phone number"
            ) : (
              <>
                We sent a code to <span className="font-semibold text-foreground">{country.dialCode} {phone}</span>
              </>
            )}
          </p>
        </div>

        {step === "phone" && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <CountrySelector
                  value={country}
                  onChange={setCountry}
                  disabled={loading}
                />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="555 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, ""))}
                  required
                  disabled={loading}
                  autoComplete="tel"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We&apos;ll send you a verification code via SMS
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading || phone.replace(/\D/g, "").length < 6}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-mono"
                maxLength={6}
                required
                disabled={loading}
                autoComplete="one-time-code"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Sign In"
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError(null);
                }}
                className="flex items-center text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Change number
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
