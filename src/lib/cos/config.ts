export type CosConfig = {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  cdnDomain?: string;
};

export function isCosConfigured(): boolean {
  return Boolean(
    process.env.COS_SECRET_ID &&
      process.env.COS_SECRET_KEY &&
      process.env.COS_BUCKET &&
      process.env.COS_REGION,
  );
}

export function getCosConfig(): CosConfig {
  const secretId = process.env.COS_SECRET_ID;
  const secretKey = process.env.COS_SECRET_KEY;
  const bucket = process.env.COS_BUCKET;
  const region = process.env.COS_REGION;

  if (!secretId || !secretKey || !bucket || !region) {
    throw new Error(
      "腾讯云 COS 环境变量未配置（需要 COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION）",
    );
  }

  return {
    secretId,
    secretKey,
    bucket,
    region,
    cdnDomain: process.env.COS_CDN_DOMAIN || undefined,
  };
}

export function buildCosPublicUrl(storageKey: string): string {
  const config = getCosConfig();

  if (config.cdnDomain) {
    const domain = config.cdnDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${domain}/${storageKey}`;
  }

  return `https://${config.bucket}.cos.${config.region}.myqcloud.com/${storageKey}`;
}
