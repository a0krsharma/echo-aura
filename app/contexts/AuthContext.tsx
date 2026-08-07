/**
 * app/contexts/AuthContext.tsx
 * ─────────────────────────────────────────────────────
 * Backward-compatibility re-export.
 * All new code should import directly from:
 *   @/app/components/AuthProvider
 *
 * Kept here so older page files that import from
 * "@/app/contexts/AuthContext" don't break.
 */

export {
  AuthProvider,
  useAuth,
} from "@/app/components/AuthProvider";

// Legacy User type alias → EchoUser
export type { EchoUser as User } from "@/lib/userDoc";
