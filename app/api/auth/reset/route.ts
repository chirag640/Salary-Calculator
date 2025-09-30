import { NextResponse, type NextRequest } from "next/server"
export const runtime = "nodejs"
import crypto from "crypto"
import { connectToDatabase } from "@/lib/mongodb"
import { hashPassword } from "@/lib/auth"
import { resetPasswordSchema } from "@/lib/validation/schemas"

// POST /api/auth/reset { token, password }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = resetPasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    const { token, password } = parsed.data

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

    const { db } = await connectToDatabase()
    const user = await db.collection("users").findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
    }

    const newHashed = await hashPassword(password)

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: { password: newHashed, updatedAt: new Date() },
        $unset: { passwordResetToken: "", passwordResetExpires: "" },
      }
    )

    return NextResponse.json({ message: "Password reset successful" })
  } catch (error) {
    console.error("Reset password error", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
