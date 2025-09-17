-- MongoDB Schema Documentation
-- This file documents the MongoDB collection structure for the time tracker

-- Collection: timeEntries
-- Schema:
{
  _id: ObjectId,
  date: "YYYY-MM-DD",
  timeIn: "HH:mm",
  timeOut: "HH:mm", 
  breakMinutes: Number,
  hourlyRate: Number,
  totalHours: Number,
  totalEarnings: Number,
  workDescription: String,
  createdAt: Date,
  updatedAt: Date
}

-- Indexes to create:
-- db.timeEntries.createIndex({ "date": 1 })
-- db.timeEntries.createIndex({ "createdAt": -1 })
