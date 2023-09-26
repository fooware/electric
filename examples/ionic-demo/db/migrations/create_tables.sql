-- Create the tables for the Ionic example
CREATE TABLE IF NOT EXISTS "appointments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- ⚡
-- Electrify the tables
CALL electric.electrify('appointments');
