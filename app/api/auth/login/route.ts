import { type NextRequest, NextResponse } from "next/server"
export const runtime = "nodejs"
import { connectToDatabase } from "@/lib/mongodb"
import { comparePassword, generateToken } from "@/lib/auth"
import type { LoginCredentials } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const { email, password }: LoginCredentials = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const user = await db.collection("users").findOne({ email })

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const token = generateToken({
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
    })

    const response = NextResponse.json({
      // token still included for backward compatibility but should not be stored client-side
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      meta: { message: "Login successful" },
    })

    // Harden cookie: HttpOnly, Secure (prod), SameSite=Strict to mitigate CSRF.
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    })
    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
