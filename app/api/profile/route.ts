import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { verifyToken } from "@/lib/auth"
import type { UpdateProfileRequest, ProfileResponse } from "@/lib/types"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
  const userId = userFromToken?._id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { db } = await connectToDatabase()
    const user = await db.collection("users").findOne({ _id: new (require("mongodb").ObjectId)(userId) })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const resp: ProfileResponse = {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      contact: user.contact,
      workingConfig: user.workingConfig,
      overtime: user.overtime,
      salaryHistory: user.salaryHistory || [],
    }
    return NextResponse.json(resp)
  } catch (e) {
    console.error("GET /api/profile error", e)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get("auth-token")?.value
    const userFromToken = cookieToken ? verifyToken(cookieToken) : null
  const userId = userFromToken?._id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body: UpdateProfileRequest = await request.json()
    const update: any = { ...body, updatedAt: new Date() }

    const { db } = await connectToDatabase()
    await db
      .collection("users")
      .updateOne({ _id: new (require("mongodb").ObjectId)(userId) }, { $set: update })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("PUT /api/profile error", e)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
