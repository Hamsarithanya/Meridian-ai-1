# Security Specification — Meridian AI Firestore

## 1. Data Invariants
1. Every document at `/workspaces/{userId}` belongs strictly to the authenticated, email-verified user whose `request.auth.uid == userId`.
2. `ownerId` is immutable after creation (`incoming().ownerId == existing().ownerId == request.auth.uid`).
3. `createdAt` is set via `serverTimestamp()` on creation and cannot be modified on update.
4. `updatedAt` must equal `request.time` on both create and update.
5. No collection-wide `list` or `delete` operations are allowed on `/workspaces` or `/workspaces/{userId}`.
6. Strict allowlist (`keys().hasAll(...) && keys().hasOnly(...)` on create; `affectedKeys().hasOnly(...)` on update) rejects any ghost/shadow fields such as `isAdmin` or `role`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated read on `/workspaces/user123`.
2. Authenticated user A reading `/workspaces/userB`.
3. `list` query across `/workspaces` collection.
4. Creating `/workspaces/userA` with `ownerId: "userB"` (Identity Spoofing).
5. Creating `/workspaces/userA` with unverified email token (`email_verified: false`).
6. Creating `/workspaces/userA` with extra shadow field `isAdmin: true`.
7. Creating `/workspaces/userA` with forged `createdAt` not equal to `request.time`.
8. Updating `/workspaces/userA` to change `ownerId` or `createdAt` (Immortal Field Violation).
9. Updating `/workspaces/userA` with `displayName` exceeding 120 characters (Resource Poisoning).
10. Document ID injection exceeding 128 chars or containing invalid symbols `/workspaces/bad$id`.
11. Deleting `/workspaces/userA` via client SDK.
12. Creating `/workspaces/userA` with `roles` array exceeding 25 items or non-map first element.
