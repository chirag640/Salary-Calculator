import ResetPasswordClient from "./ResetPasswordClient"

// Force dynamic rendering to avoid any accidental static optimization issues in deployment
export const dynamic = "force-dynamic"

export default function ResetPasswordPage() {
  // Render a client component that uses `useSearchParams`.
  return <ResetPasswordClient />
}
