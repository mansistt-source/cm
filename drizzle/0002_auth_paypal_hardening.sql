ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255);
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `passwordSalt` varchar(255);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `planKey` varchar(50) DEFAULT 'starter',
  `status` enum('active','cancelled','suspended','inactive') NOT NULL DEFAULT 'inactive',
  `paypalSubscriptionId` varchar(255),
  `creditsTotal` int DEFAULT 0,
  `creditsUsed` int DEFAULT 0,
  `renewsAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
  CONSTRAINT `subscriptions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `topupOrders` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `paypalOrderId` varchar(255) NOT NULL,
  `paypalCaptureId` varchar(255),
  `amountUsd` varchar(32) NOT NULL,
  `credits` int NOT NULL,
  `status` enum('pending','captured','cancelled','failed') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `topupOrders_id` PRIMARY KEY(`id`),
  CONSTRAINT `topupOrders_paypalOrderId_unique` UNIQUE(`paypalOrderId`)
);
