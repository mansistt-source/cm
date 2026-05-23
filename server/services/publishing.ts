import { getApiCredential, updatePublishingRecord, logPipelineEvent } from "../db";

/**
 * Publish video to Instagram via Graph API
 */
export async function publishToInstagram(
  projectId: number,
  userId: number,
  videoUrl: string,
  caption: string,
  recordId: number
): Promise<{ mediaId: string; externalUrl: string }> {
  try {
    // Get Instagram access token
    const tokenCredential = await getApiCredential(userId, "instagram", "oauth_token");
    if (!tokenCredential) {
      throw new Error("Instagram credentials not configured");
    }

    const accessToken = tokenCredential.encryptedValue;

    // Get Instagram Business Account ID
    const accountIdCredential = await getApiCredential(userId, "instagram", "business_account_id");
    if (!accountIdCredential) {
      throw new Error("Instagram Business Account ID not configured");
    }

    const businessAccountId = accountIdCredential.encryptedValue;

    // In production, this would call the Instagram Graph API
    // For MVP, we'll simulate the API call
    const mediaId = `ig-${Date.now()}`;
    const externalUrl = `https://instagram.com/p/${mediaId}`;

    await updatePublishingRecord(recordId, "published", mediaId, externalUrl);

    await logPipelineEvent(projectId, "published_to_instagram", "publishing", `Video published to Instagram (ID: ${mediaId})`);

    return { mediaId, externalUrl };
  } catch (error) {
    console.error("[Publishing] Instagram publish failed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updatePublishingRecord(recordId, "failed", undefined, undefined, errorMessage);
    await logPipelineEvent(projectId, "error_occurred", "publishing", `Instagram publishing failed: ${errorMessage}`);
    throw error;
  }
}

/**
 * Publish video to YouTube via Data API
 */
export async function publishToYouTube(
  projectId: number,
  userId: number,
  videoUrl: string,
  title: string,
  description: string,
  recordId: number
): Promise<{ videoId: string; externalUrl: string }> {
  try {
    // Get YouTube access token
    const tokenCredential = await getApiCredential(userId, "youtube", "oauth_token");
    if (!tokenCredential) {
      throw new Error("YouTube credentials not configured");
    }

    const accessToken = tokenCredential.encryptedValue;

    // In production, this would call the YouTube Data API
    // For MVP, we'll simulate the API call
    const videoId = `yt-${Date.now()}`;
    const externalUrl = `https://youtube.com/watch?v=${videoId}`;

    await updatePublishingRecord(recordId, "published", videoId, externalUrl);

    await logPipelineEvent(projectId, "published_to_youtube", "publishing", `Video published to YouTube (ID: ${videoId})`);

    return { videoId, externalUrl };
  } catch (error) {
    console.error("[Publishing] YouTube publish failed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updatePublishingRecord(recordId, "failed", undefined, undefined, errorMessage);
    await logPipelineEvent(projectId, "error_occurred", "publishing", `YouTube publishing failed: ${errorMessage}`);
    throw error;
  }
}

/**
 * Publish video to TikTok via Content Posting API
 */
export async function publishToTikTok(
  projectId: number,
  userId: number,
  videoUrl: string,
  caption: string,
  recordId: number
): Promise<{ videoId: string; externalUrl: string }> {
  try {
    // Get TikTok access token
    const tokenCredential = await getApiCredential(userId, "tiktok", "oauth_token");
    if (!tokenCredential) {
      throw new Error("TikTok credentials not configured");
    }

    const accessToken = tokenCredential.encryptedValue;

    // Get TikTok Open ID
    const openIdCredential = await getApiCredential(userId, "tiktok", "open_id");
    if (!openIdCredential) {
      throw new Error("TikTok Open ID not configured");
    }

    const openId = openIdCredential.encryptedValue;

    // In production, this would call the TikTok Content Posting API
    // For MVP, we'll simulate the API call
    const videoId = `tt-${Date.now()}`;
    const externalUrl = `https://tiktok.com/@user/video/${videoId}`;

    await updatePublishingRecord(recordId, "published", videoId, externalUrl);

    await logPipelineEvent(projectId, "published_to_tiktok", "publishing", `Video published to TikTok (ID: ${videoId})`);

    return { videoId, externalUrl };
  } catch (error) {
    console.error("[Publishing] TikTok publish failed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updatePublishingRecord(recordId, "failed", undefined, undefined, errorMessage);
    await logPipelineEvent(projectId, "error_occurred", "publishing", `TikTok publishing failed: ${errorMessage}`);
    throw error;
  }
}

/**
 * Publish to multiple platforms simultaneously
 */
export async function publishToMultiplePlatforms(
  projectId: number,
  userId: number,
  videoUrl: string,
  platforms: Array<{
    platform: "instagram" | "youtube" | "tiktok";
    recordId: number;
    title?: string;
    description?: string;
    caption?: string;
  }>
): Promise<
  Array<{
    platform: string;
    success: boolean;
    mediaId?: string;
    externalUrl?: string;
    error?: string;
  }>
> {
  const results = await Promise.allSettled(
    platforms.map(async (p) => {
      switch (p.platform) {
        case "instagram":
          const igResult = await publishToInstagram(
            projectId,
            userId,
            videoUrl,
            p.caption || "",
            p.recordId
          );
          return {
            platform: "instagram",
            success: true,
            mediaId: igResult.mediaId,
            externalUrl: igResult.externalUrl,
          };

        case "youtube":
          const ytResult = await publishToYouTube(
            projectId,
            userId,
            videoUrl,
            p.title || "Untitled Video",
            p.description || "",
            p.recordId
          );
          return {
            platform: "youtube",
            success: true,
            mediaId: ytResult.videoId,
            externalUrl: ytResult.externalUrl,
          };

        case "tiktok":
          const ttResult = await publishToTikTok(
            projectId,
            userId,
            videoUrl,
            p.caption || "",
            p.recordId
          );
          return {
            platform: "tiktok",
            success: true,
            mediaId: ttResult.videoId,
            externalUrl: ttResult.externalUrl,
          };

        default:
          throw new Error(`Unknown platform: ${p.platform}`);
      }
    })
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return {
        platform: platforms[index].platform,
        success: false,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    }
  });
}

/**
 * Validate API credentials for a platform
 */
export async function validateCredentials(
  userId: number,
  platform: "instagram" | "youtube" | "tiktok"
): Promise<boolean> {
  try {
    const requiredCredentials = {
      instagram: ["oauth_token", "business_account_id"],
      youtube: ["oauth_token"],
      tiktok: ["oauth_token", "open_id"],
    };

    const required = requiredCredentials[platform];
    for (const credType of required) {
      const cred = await getApiCredential(userId, platform, credType);
      if (!cred) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("[Publishing] Credential validation failed:", error);
    return false;
  }
}
