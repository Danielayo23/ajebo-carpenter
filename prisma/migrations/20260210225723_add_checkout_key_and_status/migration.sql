/*
  Warnings:

  - A unique constraint covering the columns `[checkoutKey]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Made the column `createdAt` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Order` ADD COLUMN `checkoutKey` VARCHAR(191) NULL,
    ADD COLUMN `checkoutStatus` ENUM('INITIATED', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'INITIATED';

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `paidAt` DATETIME(3) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX `Order_checkoutKey_key` ON `Order`(`checkoutKey`);

-- RenameIndex
ALTER TABLE `Payment` RENAME INDEX `Payment_orderId_fkey` TO `Payment_orderId_key`;

-- RenameIndex
ALTER TABLE `Payment` RENAME INDEX `Payment_reference_fkey` TO `Payment_reference_key`;
