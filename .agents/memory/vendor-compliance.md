---
name: Vendor Compliance & Verification
description: FSSAI/Drug License compliance docs, shop logo, bank holder name, admin verify/reject, vendor re-upload flow
---

## Category → Certificate mapping
- **FSSAI**: `groceries`, `vegetables`, `dairy`, `food-restaurant`, `cloud-kitchen`, `meat-fish`, `local-brands`
- **Drug License**: `medicine`
- **Optional (no requirement)**: all other categories
- Defined in `VendorRegister.tsx` and referenced in `upload.ts`, `shops.ts` routes

## DB fields added to `shops` table
- `certificateType`, `certificateNumber`, `certificateExpiryDate`, `certificateFile`, `certificateStatus`, `certificateRejectReason`
- `bankAccountHolderName`
- `verificationStatus` (default "pending")

## API routes
- `POST /api/upload/certificate` — accepts images + PDF up to 10MB, returns `fileUrl`
- `POST /api/upload/shop-image` — already existed; used for mandatory shop logo
- `PATCH /api/shops/my/certificate` — vendor re-uploads rejected cert; resets certificateStatus to "pending"
- `POST /api/shops/:id/verify` — admin verifies vendor (sets verificationStatus="verified", certificateStatus="verified")
- `POST /api/shops/:id/reject-certificate` — admin rejects cert with reason; notifies vendor

## Frontend
- `VendorRegister.tsx`: 4-step form — Step 1 (store info + logo), Step 2 (compliance docs), Step 3 (PAN/GST), Step 4 (bank details + holder name, UPI optional)
- `VendorStatus.tsx`: fetches shop via `GET /api/shops?ownerId=userId`; shows verificationStatus badge, cert rejection reason + re-upload flow
- `AuthContext.tsx`: `submitVendorApplication` passes image, certificateType/Number/ExpiryDate/File, bankAccountHolderName to POST /api/shops
- `Admin.tsx` ShopRequestsTab: shows shop logo, certificate section with verify/reject-cert buttons, bank holder name; rawShop lookup pattern used to access compliance fields

## Key decisions
**Why:** UPI ID is now optional (was required). Bank account holder name is now required.
**Why:** Shop logo uses existing `image` field (already in DB + ShopsContext). No new DB field needed.
**How to apply:** When adding new vendor registration fields, always check if the field is already in the DB schema and ShopsContext before adding a new column.
