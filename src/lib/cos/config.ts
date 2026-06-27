export type CosConfig = {
  secretId: string;
  secretKey: string;
  bucket: string;
  region: string;
  cdnDomain?: string;
};

export type CosPublicConfig = {
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

export function isCosPublicConfigured(): boolean {
  const bucket = process.env.NEXT_PUBLIC_COS_BUCKET || process.env.COS_BUCKET;
  const region = process.env.NEXT_PUBLIC_COS_REGION || process.env.COS_REGION;
  const cdnDomain = process.env.NEXT_PUBLIC_COS_CDN_DOMAIN || process.env.COS_CDN_DOMAIN;
  return Boolean(cdnDomain || (bucket && region));
}

function getCosPublicConfig(): CosPublicConfig {
  const bucket = process.env.NEXT_PUBLIC_COS_BUCKET || process.env.COS_BUCKET;
  const region = process.env.NEXT_PUBLIC_COS_REGION || process.env.COS_REGION;
  const cdnDomain = process.env.NEXT_PUBLIC_COS_CDN_DOMAIN || process.env.COS_CDN_DOMAIN;

  if (cdnDomain) {
    return { bucket: bucket || "", region: region || "", cdnDomain };
  }
  if (bucket && region) {
    return { bucket, region };
  }
  throw new Error("COS 公网配置未就绪");
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
  const pub = getCosPublicConfig();

  if (pub.cdnDomain) {
    const domain = pub.cdnDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${domain}/${storageKey}`;
  }

  return `https://${pub.bucket}.cos.${pub.region}.myqcloud.com/${storageKey}`;
}
