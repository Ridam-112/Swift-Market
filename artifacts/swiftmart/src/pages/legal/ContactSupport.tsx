import { LegalLayout, Section, InfoBox, SUPPORT_EMAIL, SUPPORT_PHONE, APP_NAME } from "./LegalLayout";
import { Link } from "wouter";

export default function ContactSupport() {
  return (
    <LegalLayout
      title="Contact & Support"
      subtitle="We're here to help"
    >
      <InfoBox>
        Have a question, complaint, or feedback? Reach out — we aim to respond within 1 business day.
      </InfoBox>

      <Section title="Contact Support">
        <p>Reach us by email or phone:</p>
        <p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-primary hover:underline font-bold text-base"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p>
          <a
            href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
            className="text-primary hover:underline font-bold text-base"
          >
            {SUPPORT_PHONE}
          </a>
        </p>
        <p className="pt-1">
          <strong className="text-foreground">Support hours:</strong> Monday to Saturday, 9:00 AM – 7:00 PM IST<br />
          <strong className="text-foreground">Response time:</strong> Within 1 business day for emails
        </p>
      </Section>

      <Section title="In-App Support">
        <p>
          If you are logged in, the fastest way to report an order issue or complaint is through the in-app form:
        </p>
        <p className="mt-2">
          <Link href="/profile" className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-xl px-4 py-2 text-sm font-semibold hover:bg-primary/20 transition-colors">
            → Go to Profile → Help & Complaints
          </Link>
        </p>
        <p className="pt-2">This sends your complaint directly to our support team with your account details attached, making it faster to resolve.</p>
      </Section>

      <Section title="Common Issues & Quick Help">
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">Order not delivered / very late?</p>
            <p>Check your order status in the Orders tab. If the status is stuck, email us with your order ID.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Wrong or missing item?</p>
            <p>Report within 2 hours of delivery via Help & Complaints or email. Include a photo if possible.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Payment deducted but no order placed?</p>
            <p>Wait 30 minutes — most auto-reverse. If not, email us with the payment screenshot and transaction ID.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Can't log in?</p>
            <p>Make sure you're using the same phone number. OTP comes as a voice call. If the issue persists, email us.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Want to become a vendor?</p>
            <p>Log in to the app and go to <em>Profile → Become a Vendor</em> to register your shop.</p>
          </div>
        </div>
      </Section>

      <Section title="Refund Requests">
        <p>
          For refunds, please see our{" "}
          <Link href="/refund-cancellation" className="text-primary hover:underline font-medium">
            Refund & Cancellation Policy
          </Link>
          . Include your order ID in the email subject for faster processing.
        </p>
        <p><strong className="text-foreground">Email subject format:</strong> "Refund Request — Order #[ID]"</p>
      </Section>

      <Section title="Grievance Officer">
        <p>As per the Consumer Protection (E-Commerce) Rules, 2020, our Grievance Officer is:</p>
        <p className="mt-1">
          <strong className="text-foreground">Name:</strong> SwiftMart Support Team<br />
          <strong className="text-foreground">Email:</strong>{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a><br />
          <strong className="text-foreground">Phone:</strong>{" "}
          <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="text-primary hover:underline">{SUPPORT_PHONE}</a><br />
          <strong className="text-foreground">Address:</strong> Balurghat, Dakshin Dinajpur, West Bengal – 733101, India<br />
          <strong className="text-foreground">Response time:</strong> Within 48 hours of receipt of complaint
        </p>
        <p className="pt-2">Grievances are acknowledged within 48 hours and resolved within 30 days as per applicable law.</p>
      </Section>

      <Section title="Account Deletion">
        <p>
          To request permanent deletion of your {APP_NAME} account and all associated data, visit our{" "}
          <Link href="/delete-account" className="text-primary hover:underline font-medium">
            Account Deletion page
          </Link>
          .
        </p>
      </Section>

      <Section title="Feedback & Suggestions">
        <p>We love hearing from our users. If you have suggestions to make {APP_NAME} better, email us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a> with the subject "Feedback".</p>
      </Section>
    </LegalLayout>
  );
}
