/*
  Warnings:

  - A unique constraint covering the columns `[paystack_ref]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Payment_paystack_ref_key` ON `Payment`(`paystack_ref`);
