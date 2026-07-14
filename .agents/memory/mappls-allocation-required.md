---
name: Mappls key requires console "Allocations" before use
description: Why a valid-looking Mappls Static Key still returns 401 "Client Credentials Expired" on every endpoint.
---

A Mappls (MapmyIndia) app's Static Key returns `401 CLIENT_CREDENTIAL_EXPIRED` /
"Client with requested id: X does not exists" on **every** endpoint (raster
tiles, map_sdk, etc.) if the app has no plan attached under
Console → Application → **Allocations → SDKs/APIs** ("No Allocations Found").
The key itself can be correct and freshly copied — the error is not about the
key string, it's about the app having zero subscribed plans.

**Why:** Mappls gateway checks allocation before accepting the client id at
all, so an unallocated key fails identically to an invalid one — easy to
mistake for a copy-paste or key-type (Static Key vs REST key) problem.

**How to apply:** Before debugging a Mappls integration further, check the
console's Allocations tab first. If empty, the user must subscribe to a
plan (even free/trial) via Mappls' Plans/Pricing section, then allocate it
to the app — this is exit outside our environment. In this project the
user ultimately chose to abandon Mappls and keep the existing
Leaflet + Carto/OSRM setup rather than resolve the allocation.
