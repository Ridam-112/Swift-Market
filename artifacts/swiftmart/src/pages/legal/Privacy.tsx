import { LegalLayout, Section, InfoBox, SUPPORT_EMAIL, APP_NAME } from "./LegalLayout";
import { SEO } from "@/components/SEO";

export default function Privacy() {
  return (
    <>
    <SEO
      title="Privacy Policy"
      description="Read SwiftMart's privacy policy. Learn how we collect, use and protect your personal data on our hyperlocal delivery platform in Balurghat."
      canonical="/privacy"
      noIndex={true}
    />
    <LegalLayout
      title="Privacy Policy"
      subtitle="Last updated: June 2025"
    >
      <InfoBox>
        {APP_NAME} is committed to protecting your privacy. This policy explains what data
        we collect, why we collect it, and how you can control it.
      </InfoBox>

      <Section title="1. Information We Collect">
        <p><strong className="text-foreground">Account information:</strong> When you sign up, we collect your phone number (required for OTP login) and optionally your name and email address.</p>
        <p><strong className="text-foreground">Address information:</strong> Delivery addresses you save (street, area, city, pincode). Your pincode is used to show you shops that deliver to your location.</p>
        <p><strong className="text-foreground">Order history:</strong> Products you purchase, order amounts, delivery addresses, and timestamps.</p>
        <p><strong className="text-foreground">Device information:</strong> Device type, operating system version, and push notification token (for delivery alerts). We do not collect precise GPS location.</p>
        <p><strong className="text-foreground">Support communications:</strong> Messages you send through the Help & Complaints form.</p>
      </Section>

      <Section title="2. How We Use Your Information">
        <ul className="list-disc list-inside space-y-1">
          <li>To create and manage your account</li>
          <li>To process and deliver your orders</li>
          <li>To send OTP verification codes by voice call</li>
          <li>To send push notifications about your order status</li>
          <li>To show you shops and products available in your pincode area</li>
          <li>To respond to your support requests</li>
          <li>To detect and prevent fraud</li>
          <li>To improve our platform and fix bugs</li>
        </ul>
        <p className="pt-1">We do <strong className="text-foreground">not</strong> sell your personal information to third parties.</p>
      </Section>

      <Section title="3. Third-Party Services">
        <p>We use the following services which may process your data:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li><strong className="text-foreground">Razorpay</strong> — Payment processing. Your card/UPI details go directly to Razorpay and are never stored by {APP_NAME}. Subject to Razorpay's Privacy Policy.</li>
          <li><strong className="text-foreground">Firebase (Google)</strong> — Optional Google sign-in authentication. Subject to Google's Privacy Policy.</li>
          <li><strong className="text-foreground">2Factor.in</strong> — OTP delivery via voice call to your phone number.</li>
          <li><strong className="text-foreground">Cloudinary</strong> — Storage of product and shop images uploaded by vendors.</li>
        </ul>
      </Section>

      <Section title="4. Data Sharing">
        <p>Your personal data is shared only as follows:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li><strong className="text-foreground">With the vendor fulfilling your order</strong> — your name, delivery address, and order details are shared with the local shop delivering to you.</li>
          <li><strong className="text-foreground">With payment processors</strong> — Razorpay processes your payment securely.</li>
          <li><strong className="text-foreground">As required by law</strong> — if required by a court order or legal obligation.</li>
        </ul>
        <p className="pt-1">We never share your data with advertisers or marketing companies.</p>
      </Section>

      <Section title="5. Data Retention">
        <p>We retain your account data as long as your account is active. Order records are retained for 7 years as required by Indian tax and accounting law (GST Act).</p>
        <p>If you delete your account, personal data (name, phone, addresses) is deleted within 30 days. Order transaction records may be retained for the statutory period.</p>
      </Section>

      <Section title="6. Your Rights">
        <p>You have the right to:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li><strong className="text-foreground">Access</strong> — request a copy of your personal data</li>
          <li><strong className="text-foreground">Correction</strong> — update incorrect data (name, email, address) in the app</li>
          <li><strong className="text-foreground">Deletion</strong> — request deletion of your account and personal data</li>
          <li><strong className="text-foreground">Portability</strong> — request your order history in a readable format</li>
        </ul>
        <p className="pt-1">
          To exercise these rights, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>{" "}
          with the subject "Privacy Request".
        </p>
      </Section>

      <Section title="7. Security">
        <p>We use industry-standard security measures including HTTPS encryption, JWT-based authentication, and secure password-free login via OTP. Payment data is handled entirely by PCI-compliant Razorpay.</p>
        <p>While we take reasonable steps to protect your data, no internet transmission is 100% secure. Please keep your OTP codes confidential and do not share them with anyone.</p>
      </Section>

      <Section title="8. Children's Privacy">
        <p>{APP_NAME} is intended for users aged 18 and above. We do not knowingly collect personal data from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.</p>
      </Section>

      <Section title="9. Cookies & Local Storage">
        <p>Our mobile app does not use cookies. Our web interface uses browser localStorage to store your authentication token and preferences. No tracking cookies or advertising pixels are used.</p>
      </Section>

      <Section title="10. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or via your registered contact. The "last updated" date at the top of this page reflects the current version.</p>
        <p>Continued use of the app after changes constitutes your acceptance of the revised policy.</p>
      </Section>

      <Section title="11. Contact Us">
        <p>For privacy-related questions, requests, or concerns:</p>
        <p>
          <strong className="text-foreground">Email:</strong>{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>
        </p>
        <p><strong className="text-foreground">Subject line:</strong> "Privacy — [Your Request]"</p>
        <p><strong className="text-foreground">Response time:</strong> Within 5 business days</p>
        <p className="pt-2"><strong className="text-foreground">Grievance Officer:</strong><br />
          Name: SwiftMart Support Team<br />
          Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a><br />
          Address: Balurghat, Dakshin Dinajpur, West Bengal, India
        </p>
      </Section>
    </LegalLayout>
    </>
  );
}
