import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Terms of Service - Memoir",
  description: "Terms of Service for Memoir - Your family story platform",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo-32.png" alt="Memoir" width={28} height={28} />
            <span className="text-xl font-bold">Memoir</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 2024</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Memoir (&quot;the Service&quot;) at memoir.bot, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service. We reserve the right to modify these Terms at any time, and your continued use of the Service constitutes acceptance of any modifications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Memoir is a platform that helps users create, preserve, and share their life stories and family memoirs. The Service includes features such as voice recording and transcription, AI-assisted writing, story organization, and the ability to invite family members and friends to contribute their own stories.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">To use certain features of the Service, you must create an account. You agree to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update any changes to your information</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Content</h2>
            <h3 className="text-xl font-medium mb-3">4.1 Your Content</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You retain ownership of all content you create, upload, or share through the Service (&quot;User Content&quot;). By using the Service, you grant us a limited license to store, process, and display your content solely for the purpose of providing the Service.
            </p>

            <h3 className="text-xl font-medium mb-3">4.2 Content Responsibilities</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">You are solely responsible for your User Content. You agree not to post content that:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Infringes on intellectual property rights of others</li>
              <li>Contains illegal, harmful, or offensive material</li>
              <li>Violates the privacy or rights of any third party</li>
              <li>Contains malware, spam, or malicious code</li>
              <li>Impersonates another person or entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Invited Contributors</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may invite family members and friends to contribute stories to your memoir. You are responsible for obtaining appropriate consent before inviting others. Contributors must agree to these Terms to use the Service. You may approve, edit, or remove contributed content at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. AI Features</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service uses artificial intelligence to assist with transcription, writing suggestions, and content organization. While we strive for accuracy, AI-generated content may contain errors. You are responsible for reviewing and editing all AI-assisted content. We do not guarantee the accuracy of transcriptions or AI suggestions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Pricing and Payment</h2>
            <p className="text-muted-foreground leading-relaxed">
              Memoir is currently free to use during our beta period. We may introduce paid features or subscription plans in the future. Any changes to pricing will be communicated in advance, and you will have the option to continue using free features or upgrade to paid plans.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Prohibited Uses</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Use the Service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Use the Service to harass, abuse, or harm others</li>
              <li>Resell or redistribute the Service without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service, including its design, features, and content (excluding User Content), is owned by Memoir and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason at our discretion. You may delete your account at any time through the settings page. Upon termination, your right to use the Service ceases immediately, but provisions that should survive termination will remain in effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Disclaimers</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. WE ARE NOT RESPONSIBLE FOR ANY LOSS OF DATA OR CONTENT.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MEMOIR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms or the Service shall be resolved through binding arbitration or in courts of competent jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p className="text-muted-foreground mt-4">
              Email: <a href="mailto:legal@memoir.bot" className="text-primary hover:underline">legal@memoir.bot</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Memoir. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
