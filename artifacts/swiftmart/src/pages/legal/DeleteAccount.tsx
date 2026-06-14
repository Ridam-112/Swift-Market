import { LegalLayout, Section, InfoBox, SUPPORT_EMAIL, APP_NAME } from "./LegalLayout";
import { Link } from "wouter";

export default function DeleteAccount() {
  return (
    <LegalLayout
      title="Delete Your Account"
      subtitle="Permanent account deletion"
    >
      <InfoBox>
        Account deletion is permanent and cannot be undone. Please read this page carefully before requesting deletion.
      </InfoBox>

      <Section title="How to Delete Your Account">
        <p>There are two ways to request account deletion:</p>

        <div className="mt-2 space-y-4">
          <div className="bg-background rounded-xl p-4 space-y-1">
            <p className="font-semibold text-foreground">Option 1 — Email Request (Recommended)</p>
            <p>Send an email from your registered contact to:</p>
            <p>
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Account Deletion Request&body=Please delete my ${APP_NAME} account. My registered phone number is: [YOUR PHONE NUMBER]`}
                className="text-primary hover:underline font-bold">
                {SUPPORT_EMAIL}
              </a>
            </p>
            <p className="mt-1"><strong className="text-foreground">Subject:</strong> "Account Deletion Request"</p>
            <p><strong className="text-foreground">Include in your message:</strong> Your registered phone number (we use this to verify your identity before deleting your account).</p>
          </div>

          <div className="bg-background rounded-xl p-4 space-y-1">
            <p className="font-semibold text-foreground">Option 2 — In-App (via Support)</p>
            <p>If you are logged in, go to:</p>
            <p>
              <Link href="/profile" className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-xl px-3 py-1.5 text-sm font-semibold hover:bg-primary/20 transition-colors mt-1">
                → Profile → Help & Complaints → Account / Login
              </Link>
            </p>
            <p className="mt-1">Submit a complaint with category "Account / Login" and message "Please delete my account permanently."</p>
          </div>
        </div>
      </Section>

      <Section title="Verification Process">
        <p>To protect your account from unauthorised deletion requests, we will:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Verify your identity using your registered phone number</li>
          <li>Check for any pending orders (deletion is paused until all orders are delivered or cancelled)</li>
          <li>Send a confirmation before proceeding</li>
        </ul>
      </Section>

      <Section title="What Gets Deleted">
        <p>When your account is deleted, we permanently remove:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Your name and email address</li>
          <li>Your phone number from our active user database</li>
          <li>All saved delivery addresses</li>
          <li>Your cart and wishlist items</li>
          <li>Push notification subscription</li>
          <li>All personal profile data</li>
        </ul>
      </Section>

      <Section title="What We Retain (Legal Requirements)">
        <p>Even after account deletion, we are legally required to retain certain records:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li><strong className="text-foreground">Order transaction records</strong> — retained for 7 years as required by the GST Act and Indian tax law. These are retained in anonymised or pseudonymised form where possible.</li>
          <li><strong className="text-foreground">Payment transaction records</strong> — retained by Razorpay as required by RBI and payment regulations.</li>
          <li><strong className="text-foreground">Support communication logs</strong> — retained for up to 3 years for legal compliance.</li>
        </ul>
        <p className="pt-1">This data is retained only as required by law and is not used for marketing or shared with third parties.</p>
      </Section>

      <Section title="Effect on Vendor Accounts">
        <p>If you are a registered vendor on {APP_NAME}, deleting your account will also:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Remove your shop listing and all products</li>
          <li>Cancel your vendor registration</li>
          <li>Make your shop invisible to customers immediately</li>
        </ul>
        <p className="pt-1">Any pending payouts for completed orders will be processed before deletion is finalised. Please ensure your bank account details are correct before requesting deletion.</p>
      </Section>

      <Section title="Timeline">
        <p><strong className="text-foreground">Acknowledgement:</strong> Within 48 hours of receiving your request</p>
        <p><strong className="text-foreground">Identity verification:</strong> 1–2 business days</p>
        <p><strong className="text-foreground">Account deletion:</strong> Within 30 days of verified request</p>
        <p className="pt-1">You will receive a confirmation email once your account has been deleted. After deletion, you can create a new account with the same phone number if you wish to use {APP_NAME} again in the future.</p>
      </Section>

      <Section title="Contact">
        <p>
          Email: <a href={`mailto:${SUPPORT_EMAIL}?subject=Account Deletion Request`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a><br />
          Subject: "Account Deletion Request"<br />
          Response: Within 48 hours
        </p>
      </Section>

      <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-4 text-sm text-destructive leading-relaxed">
        <strong>⚠️ This action is irreversible.</strong> Once your account is deleted, your order history, addresses, and all account data cannot be recovered. If you are having trouble with the app, consider contacting{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline font-medium">support</a>{" "}
        first — we may be able to help without deleting your account.
      </div>
    </LegalLayout>
  );
}
