-- MongoDB Schema Update for User Authentication and Isolation
-- This script adds user authentication and updates existing collections

-- Create users collection
db.users.createIndex({ "email": 1 }, { unique: true })

-- Update timeEntries collection to add userId field
-- Note: Existing entries without userId will need to be migrated or removed
db.timeEntries.createIndex({ "userId": 1, "date": -1 })
db.timeEntries.createIndex({ "userId": 1, "createdAt": -1 })

-- Sample user document structure:
-- {
--   "_id": ObjectId,
--   "name": "John Doe",
--   "email": "john@example.com",
--   "password": "hashed_password",
--   "createdAt": ISODate,
--   "updatedAt": ISODate
-- }

-- Updated timeEntries document structure:
-- {
--   "_id": ObjectId,
--   "userId": "user_object_id_string",
--   "date": "2024-01-15",
--   "timeIn": "09:00",
--   "timeOut": "17:00",
--   "breakMinutes": 60,
--   "hourlyRate": 25,
--   "totalHours": 7,
--   "totalEarnings": 175,
--   "workDescription": "Working on project tasks",
--   "client": "Client Name",
--   "project": "Project Name",
--   "leave": {
--     "isLeave": false,
--     "leaveType": null,
--     "leaveReason": null
--   },
--   "createdAt": ISODate,
--   "updatedAt": ISODate
-- }
