-- CreateTable (first, so existing assignments can be copied in)
CREATE TABLE `task_assignee` (
    `taskId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_assignee_userId_idx`(`userId`),
    PRIMARY KEY (`taskId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `task_assignee` ADD CONSTRAINT `task_assignee_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_assignee` ADD CONSTRAINT `task_assignee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing single-assignee data
INSERT INTO `task_assignee` (`taskId`, `userId`)
SELECT `id`, `assignedToId` FROM `task` WHERE `assignedToId` IS NOT NULL;

-- DropForeignKey
ALTER TABLE `task` DROP FOREIGN KEY `task_assignedToId_fkey`;

-- DropIndex
DROP INDEX `task_assignedToId_idx` ON `task`;

-- AlterTable
ALTER TABLE `task` DROP COLUMN `assignedToId`;
