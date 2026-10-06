/*
  Warnings:

  - A unique constraint covering the columns `[shareToken]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "File" ADD COLUMN     "shareExpiresAt" TIMESTAMP(3),
ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "File_shareToken_key" ON "File"("shareToken");
