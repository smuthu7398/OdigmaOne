-- AlterTable
ALTER TABLE `client` ADD COLUMN `accountManagerId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `client` ADD CONSTRAINT `client_accountManagerId_fkey` FOREIGN KEY (`accountManagerId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
