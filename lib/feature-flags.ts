const voiceBillingFlag = process.env.NEXT_PUBLIC_VOICE_BILLING ?? "false"

export const featureFlags = {
  voiceBilling: voiceBillingFlag === "true"
}
