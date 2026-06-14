import { LegalLayout, Section, InfoBox, SUPPORT_EMAIL, APP_NAME } from "./LegalLayout";

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="Last updated: June 2025"
    >
      <InfoBox>
        By creating an account or placing an order on {APP_NAME}, you agree to these Terms of Service. Please read them carefully.
      </InfoBox>

      <Section title="1. Acceptance of Terms">
        <p>These Terms of Service ("Terms") govern your use of the {APP_NAME} mobile application and website (collectively, the "Platform") operated by SwiftMart ("we", "us", or "our").</p>
        <p>By accessing or using the Platform, you confirm that you are at least 18 years old (or have parental consent if between 13–18), and agree to be bound by these Terms.</p>
      </Section>

      <Section title="2. Description of Service">
        <p>{APP_NAME} is a hyperlocal commerce platform that connects customers with local shops and pharmacies for delivery of groceries, medicines, and daily essentials. We operate as a marketplace — the actual sale and delivery is fulfilled by the local vendor.</p>
        <p>Service is currently available only in select pincodes in West Bengal, India. Availability may change at any time.</p>
      </Section>

      <Section title="3. User Accounts">
        <p>You must provide accurate information when creating an account. You are responsible for keeping your account credentials and OTP codes confidential. You must not share your account or allow others to use it.</p>
        <p>We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraud, or abuse the platform.</p>
      </Section>

      <Section title="4. Ordering & Delivery">
        <p><strong className="text-foreground">Order acceptance:</strong> Placing an order is an offer to purchase. The contract is formed when the vendor accepts your order.</p>
        <p><strong className="text-foreground">Delivery time:</strong> We aim for approximately 10-minute delivery, but actual times depend on the vendor's preparation time, distance, and local conditions. Delivery time estimates are not guaranteed.</p>
        <p><strong className="text-foreground">Delivery area:</strong> Delivery is available only within the serviceable pincode area. Orders outside this area cannot be processed.</p>
        <p><strong className="text-foreground">Product availability:</strong> Products shown are subject to availability. A vendor may cancel an order if an item is out of stock, in which case a full refund will be issued.</p>
        <p><strong className="text-foreground">Acceptance at delivery:</strong> Please verify your order at delivery. Claims about missing or wrong items must be raised within 2 hours of delivery via support.</p>
      </Section>

      <Section title="5. Pricing & Payments">
        <p>All prices are in Indian Rupees (₹) and inclusive of applicable taxes. Prices may vary by vendor and may change without notice.</p>
        <p>Payments are processed securely through Razorpay. We accept UPI, debit cards, credit cards, and net banking. {APP_NAME} does not store your payment card details.</p>
        <p>If a payment fails but your account is debited, the amount is typically reversed within 5–7 business days by your bank. Contact us if this does not happen.</p>
      </Section>

      <Section title="6. Cancellations & Refunds">
        <p>Please refer to our <a href="/refund-cancellation" className="text-primary hover:underline font-medium">Refund & Cancellation Policy</a> for full details.</p>
        <p>In summary: orders can be cancelled before the vendor starts preparing them. Once preparation begins, cancellation may not be possible. Refunds for eligible orders are processed within 3–7 business days.</p>
      </Section>

      <Section title="7. Vendor Obligations">
        <p>Vendors listed on {APP_NAME} are independent businesses. They are responsible for the quality, freshness, and accuracy of their products, as well as compliance with applicable food safety and licensing laws (FSSAI, Drug License, etc.).</p>
        <p>{APP_NAME} does not warrant the quality of any vendor's products. However, we take complaints seriously and may remove vendors who consistently fail to meet standards.</p>
      </Section>

      <Section title="8. Prohibited Conduct">
        <p>You agree not to:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Use the platform for any unlawful purpose</li>
          <li>Submit false or fraudulent orders</li>
          <li>Harass, abuse, or threaten vendors or delivery staff</li>
          <li>Attempt to access accounts other than your own</li>
          <li>Use automated tools (bots, scrapers) to access the platform</li>
          <li>Impersonate any person or organisation</li>
          <li>Attempt to reverse-engineer or copy the platform</li>
        </ul>
      </Section>

      <Section title="9. Intellectual Property">
        <p>The {APP_NAME} name, logo, app interface, and all content on the platform are the intellectual property of SwiftMart. You may not copy, reproduce, or use them without our written consent.</p>
        <p>Product images and descriptions provided by vendors remain the property of the respective vendors.</p>
      </Section>

      <Section title="10. Limitation of Liability">
        <p>{APP_NAME} is a marketplace and is not responsible for:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Product quality issues from vendors</li>
          <li>Delays due to traffic, weather, or force majeure events</li>
          <li>Losses arising from incorrect delivery addresses provided by the customer</li>
          <li>Third-party payment failures or bank processing delays</li>
        </ul>
        <p className="pt-1">Our maximum liability to you for any claim is limited to the value of the order in question.</p>
      </Section>

      <Section title="11. Governing Law & Disputes">
        <p>These Terms are governed by the laws of India. Any disputes will be subject to the exclusive jurisdiction of courts in Dakshin Dinajpur, West Bengal, India.</p>
        <p>We encourage you to contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a> before initiating any legal proceedings so we can try to resolve the issue amicably.</p>
      </Section>

      <Section title="12. Changes to Terms">
        <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the revised Terms. We will notify you of material changes through the app.</p>
      </Section>

      <Section title="13. Contact">
        <p>
          For questions about these Terms, contact us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
        </p>
      </Section>
    </LegalLayout>
  );
}
