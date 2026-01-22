/**
 * Example Refactored API Route
 *
 * This file demonstrates how to use the new middleware utilities
 * for cleaner, more maintainable API routes.
 *
 * Key improvements:
 * - Centralized authentication via withAuth
 * - Standardized error responses
 * - Input validation via Zod schemas
 * - Proper logging
 * - Type safety
 */

import { type NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  withAuth,
  successResponse,
  errorResponse,
  Errors,
  ErrorCodes,
  validateObjectId,
  type AuthUser,
} from "@/lib/api-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import {
  parseAndValidateBody,
  updateTimeEntryBodySchema,
} from "@/lib/validation/middleware";
import type { TimeEntry } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GET /api/v1/time-entries/[id]
 *
 * Retrieve a single time entry by ID
 */
async function handleGet(
  request: NextRequest,
  user: AuthUser,
  context?: { params: Record<string, string> },
) {
  const idResult = validateObjectId(context?.params?.id, "id");
  if (!idResult.valid) {
    return idResult.error;
  }

  const { db } = await connectToDatabase();

  const entry = await db.collection<TimeEntry>("timeEntries").findOne({
    _id: new ObjectId(idResult.id),
    userId: user._id,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  });

  if (!entry) {
    return Errors.notFound("Time entry");
  }

  return successResponse(entry);
}

/**
 * PUT /api/v1/time-entries/[id]
 *
 * Update a time entry
 */
async function handlePut(
  request: NextRequest,
  user: AuthUser,
  context?: { params: Record<string, string> },
) {
  // Validate ID
  const idResult = validateObjectId(context?.params?.id, "id");
  if (!idResult.valid) {
    return idResult.error;
  }

  // Validate body
  const bodyResult = await parseAndValidateBody(
    request,
    updateTimeEntryBodySchema,
  );
  if (!bodyResult.success) {
    return bodyResult.error;
  }

  const { db } = await connectToDatabase();

  // Check entry exists and belongs to user
  const existing = await db.collection<TimeEntry>("timeEntries").findOne({
    _id: new ObjectId(idResult.id),
    userId: user._id,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  });

  if (!existing) {
    return Errors.notFound("Time entry");
  }

  // Update entry
  const updateData = {
    ...bodyResult.data,
    updatedAt: new Date(),
  };

  const result = await db
    .collection<TimeEntry>("timeEntries")
    .findOneAndUpdate(
      { _id: new ObjectId(idResult.id) },
      { $set: updateData },
      { returnDocument: "after" },
    );

  if (!result) {
    logger.error("Failed to update time entry", {
      entryId: idResult.id,
      userId: user._id,
    });
    return Errors.internalError("Failed to update entry");
  }

  logger.info("Time entry updated", {
    entryId: idResult.id,
    userId: user._id,
  });

  return successResponse(result, { message: "Entry updated successfully" });
}

/**
 * DELETE /api/v1/time-entries/[id]
 *
 * Soft delete a time entry
 */
async function handleDelete(
  request: NextRequest,
  user: AuthUser,
  context?: { params: Record<string, string> },
) {
  const idResult = validateObjectId(context?.params?.id, "id");
  if (!idResult.valid) {
    return idResult.error;
  }

  const { db } = await connectToDatabase();

  // Check entry exists and belongs to user
  const existing = await db.collection<TimeEntry>("timeEntries").findOne({
    _id: new ObjectId(idResult.id),
    userId: user._id,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  });

  if (!existing) {
    return Errors.notFound("Time entry");
  }

  // Soft delete
  await db.collection<TimeEntry>("timeEntries").updateOne(
    { _id: new ObjectId(idResult.id) },
    {
      $set: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  logger.info("Time entry soft deleted", {
    entryId: idResult.id,
    userId: user._id,
  });

  return successResponse(null, { message: "Entry deleted successfully" });
}

// Export handlers wrapped with auth middleware
export const GET = withAuth(handleGet, { requireCsrf: false });

export const PUT = withAuth(handlePut, {
  requireCsrf: true,
  rateLimit: { windowMs: 60000, max: 30, key: "time-entry-update" },
});

export const DELETE = withAuth(handleDelete, {
  requireCsrf: true,
  rateLimit: { windowMs: 60000, max: 10, key: "time-entry-delete" },
});
