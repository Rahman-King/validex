/**
 * Verification Page
 * Standalone page for data verification
 */

import { VerificationPanel } from "@/components/verification/verification-panel"

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20">
      <VerificationPanel />
    </div>
  )
}
