CREATE TABLE `apiCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`service` varchar(100) NOT NULL,
	`credentialType` varchar(100) NOT NULL,
	`encryptedValue` longtext NOT NULL,
	`expiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apiCredentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipelineEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`stage` varchar(100) NOT NULL,
	`message` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pipelineEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`initialPrompt` longtext NOT NULL,
	`videoLength` int NOT NULL,
	`genre` varchar(100) NOT NULL,
	`status` enum('draft','generating_storyboard','storyboard_ready','generating_frames','generating_clips','generating_montage','completed','failed') NOT NULL DEFAULT 'draft',
	`currentStage` varchar(100),
	`finalVideoUrl` varchar(512),
	`finalVideoKey` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `publishingRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`platform` enum('instagram','youtube','tiktok') NOT NULL,
	`status` enum('pending','publishing','published','failed') NOT NULL DEFAULT 'pending',
	`externalMediaId` varchar(255),
	`externalUrl` varchar(512),
	`errorMessage` text,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `publishingRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneNumber` int NOT NULL,
	`description` longtext NOT NULL,
	`duration` int NOT NULL,
	`visualStyle` varchar(255),
	`startFrameUrl` varchar(512),
	`startFrameKey` varchar(255),
	`endFrameUrl` varchar(512),
	`endFrameKey` varchar(255),
	`videoClipUrl` varchar(512),
	`videoClipKey` varchar(255),
	`generationStatus` enum('pending','generating_frames','frames_ready','generating_clip','clip_ready','failed') NOT NULL DEFAULT 'pending',
	`higgsFieldRequestId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scenes_id` PRIMARY KEY(`id`)
);
