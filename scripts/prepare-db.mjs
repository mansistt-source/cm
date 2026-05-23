import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[DB PREPARE] DATABASE_URL is required");
  process.exit(1);
}

const connection = await mysql.createConnection(databaseUrl);

async function exec(sql) {
  await connection.query(sql);
}

async function columnExists(table, column) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows?.[0]?.count ?? 0) > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`[DB PREPARE] ${table}.${column} already exists`);
    return;
  }

  console.log(`[DB PREPARE] Adding ${table}.${column}`);
  await exec(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
}

try {
  await exec(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`openId\` varchar(64) NOT NULL,
      \`name\` text,
      \`email\` varchar(320),
      \`loginMethod\` varchar(64),
      \`passwordHash\` varchar(255),
      \`passwordSalt\` varchar(255),
      \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      \`lastSignedIn\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`users_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`users_openId_unique\` UNIQUE(\`openId\`)
    )
  `);

  await addColumnIfMissing("users", "passwordHash", "`passwordHash` varchar(255)");
  await addColumnIfMissing("users", "passwordSalt", "`passwordSalt` varchar(255)");

  await exec(`
    CREATE TABLE IF NOT EXISTS \`apiCredentials\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`service\` varchar(100) NOT NULL,
      \`credentialType\` varchar(100) NOT NULL,
      \`encryptedValue\` longtext NOT NULL,
      \`expiresAt\` timestamp,
      \`isActive\` boolean NOT NULL DEFAULT true,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`apiCredentials_id\` PRIMARY KEY(\`id\`)
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS \`projects\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`title\` varchar(255) NOT NULL,
      \`description\` text,
      \`initialPrompt\` longtext NOT NULL,
      \`videoLength\` int NOT NULL,
      \`genre\` varchar(100) NOT NULL,
      \`status\` enum('draft','generating_storyboard','storyboard_ready','generating_frames','generating_clips','generating_montage','completed','failed') NOT NULL DEFAULT 'draft',
      \`currentStage\` varchar(100),
      \`finalVideoUrl\` varchar(512),
      \`finalVideoKey\` varchar(255),
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      \`publishedAt\` timestamp,
      CONSTRAINT \`projects_id\` PRIMARY KEY(\`id\`)
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS \`scenes\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`projectId\` int NOT NULL,
      \`sceneNumber\` int NOT NULL,
      \`description\` longtext NOT NULL,
      \`duration\` int NOT NULL,
      \`visualStyle\` varchar(255),
      \`startFrameUrl\` varchar(512),
      \`startFrameKey\` varchar(255),
      \`endFrameUrl\` varchar(512),
      \`endFrameKey\` varchar(255),
      \`videoClipUrl\` varchar(512),
      \`videoClipKey\` varchar(255),
      \`generationStatus\` enum('pending','generating_frames','frames_ready','generating_clip','clip_ready','failed') NOT NULL DEFAULT 'pending',
      \`higgsFieldRequestId\` varchar(255),
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`scenes_id\` PRIMARY KEY(\`id\`)
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS \`publishingRecords\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`projectId\` int NOT NULL,
      \`platform\` enum('instagram','youtube','tiktok') NOT NULL,
      \`status\` enum('pending','publishing','published','failed') NOT NULL DEFAULT 'pending',
      \`externalMediaId\` varchar(255),
      \`externalUrl\` varchar(512),
      \`errorMessage\` text,
      \`publishedAt\` timestamp,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`publishingRecords_id\` PRIMARY KEY(\`id\`)
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS \`pipelineEvents\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`projectId\` int NOT NULL,
      \`eventType\` varchar(100) NOT NULL,
      \`stage\` varchar(100) NOT NULL,
      \`message\` text,
      \`metadata\` json,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`pipelineEvents_id\` PRIMARY KEY(\`id\`)
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS \`subscriptions\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`planKey\` varchar(50) DEFAULT 'starter',
      \`status\` enum('active','cancelled','suspended','inactive') NOT NULL DEFAULT 'inactive',
      \`paypalSubscriptionId\` varchar(255),
      \`creditsTotal\` int DEFAULT 0,
      \`creditsUsed\` int DEFAULT 0,
      \`renewsAt\` timestamp,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`subscriptions_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`subscriptions_userId_unique\` UNIQUE(\`userId\`)
    )
  `);

  await exec(`
    CREATE TABLE IF NOT EXISTS \`topupOrders\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`paypalOrderId\` varchar(255) NOT NULL,
      \`paypalCaptureId\` varchar(255),
      \`amountUsd\` varchar(32) NOT NULL,
      \`credits\` int NOT NULL,
      \`status\` enum('pending','captured','cancelled','failed') NOT NULL DEFAULT 'pending',
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`topupOrders_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`topupOrders_paypalOrderId_unique\` UNIQUE(\`paypalOrderId\`)
    )
  `);

  console.log("[DB PREPARE] Database is ready");
} finally {
  await connection.end();
}
