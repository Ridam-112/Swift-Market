import { LegalLayout, Section, InfoBox, SUPPORT_EMAIL } from "./LegalLayout";
import { SEO } from "@/components/SEO";

export default function RefundCancellation() {
  return (
    <>
    <SEO
      title="Refund & Cancellation Policy"
      description="SwiftMart's refund and cancellation policy. Learn how to cancel orders and request refunds for purchases made on our Balurghat delivery platform."
      canonical="/refund-cancellation"
    />
    <LegalLayout
      title="Refund & Cancellation"
      subtitle="Last updated: June 2025"
    >
      <InfoBox>
        We want every order to be perfect. If something goes wrong, we'll make it right. Read below to understand how cancellations and refunds work.
      </InfoBox>

      <Section title="Cancellation Policy">
        <p><strong className="text-foreground">Before vendor accepts order:</strong> You can cancel your order for free before the vendor accepts it. A full refund will be issued automatically.</p>
        <p><strong className="text-foreground">After vendor accepts (preparing):</strong> Once the vendor starts preparing your order, cancellation may not be possible. Please contact support immediately — we will try our best to stop the order, but this cannot be guaranteed.</p>
        <p><strong className="text-foreground">After delivery:</strong> Orders cannot be cancelled after they have been delivered.</p>
        <p><strong className="text-foreground">How to cancel:</strong> Go to <em>Orders → Your Order → Cancel Order</em>, or contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.</p>
      </Section>

      <Section title="Vendor-Initiated Cancellations">
        <p>Occasionally a vendor may cancel your order due to:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Item out of stock</li>
          <li>Shop closed unexpectedly</li>
          <li>Unable to fulfil delivery in your area</li>
        </ul>
        <p className="pt-1">In all such cases, you will receive a <strong className="text-foreground">full refund automatically</strong> within 3–5 business days.</p>
      </Section>

      <Section title="Refund Eligibility">
        <p>You are eligible for a refund if:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Your order was cancelled before preparation</li>
          <li>The vendor cancelled your order</li>
          <li>An item was missing from your delivery</li>
          <li>You received a wrong item</li>
          <li>The item was damaged, spoiled, or unfit for consumption at delivery</li>
          <li>Your payment was charged but no order was placed (payment failure with debit)</li>
        </ul>
      </Section>

      <Section title="Non-Refundable Cases">
        <p>Refunds will <strong className="text-foreground">not</strong> be issued for:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Change of mind after delivery</li>
          <li>Perishable items (vegetables, dairy, cooked food) that have been accepted at delivery without complaint</li>
          <li>Items damaged after delivery due to customer mishandling</li>
          <li>Orders where an incorrect delivery address was provided by the customer</li>
          <li>Promotional or discounted items marked as non-refundable</li>
        </ul>
      </Section>

      <Section title="How to Request a Refund">
        <p><strong className="text-foreground">Step 1:</strong> Report the issue within <strong className="text-foreground">2 hours of delivery</strong> for best results.</p>
        <p><strong className="text-foreground">Step 2:</strong> Go to <em>Profile → Help & Complaints</em> and select "Order Issue", or email us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.</p>
        <p><strong className="text-foreground">Step 3:</strong> Include your order ID, a description of the issue, and photos if possible.</p>
        <p><strong className="text-foreground">Step 4:</strong> Our team will review within 1–2 business days and initiate a refund if eligible.</p>
      </Section>

      <Section title="Refund Timeline">
        <p>Once a refund is approved:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li><strong className="text-foreground">UPI / Net Banking:</strong> 1–3 business days</li>
          <li><strong className="text-foreground">Debit card:</strong> 3–5 business days</li>
          <li><strong className="text-foreground">Credit card:</strong> 5–7 business days</li>
        </ul>
        <p className="pt-1">Refunds are credited back to the original payment method. We do not issue cash refunds.</p>
        <p>If your refund is not received within 7 business days, please contact your bank and also reach out to us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.</p>
      </Section>

      <Section title="Contact for Refund Issues">
        <p>
          Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a><br />
          Subject: "Refund Request — Order #[your order ID]"<br />
          Response time: 1–2 business days
        </p>
      </Section>
    </LegalLayout>
    </>
  );
}
