---
name: Order variant pricing
description: Durable rules for preserving selected product weights and prices through checkout and fulfillment
---

The selected product variant is part of the order line identity, not display-only metadata. A weight-based line must preserve its selected amount, stable variant identifier, trusted unit price, and quantity from cart through fulfillment.

**Why:** A product's stored base price commonly represents the largest/default unit, so rebuilding a line from only the product ID can silently charge the wrong amount or merge distinct weights.

**How to apply:** Keep variant data in cart identity and requests, calculate each line independently on the server, reject missing or mismatched variant data, and expose the selected variant in customer, admin, vendor, and rider views.