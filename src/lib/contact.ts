import { z } from "zod";

const trimmedRequired = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label}不能为空`)
    .max(max, `${label}不能超过 ${max} 个字符`);

const contactSubmissionSchema = z.object({
  type: z.enum(["hiring", "commercial"]),
  name: trimmedRequired("姓名", 80),
  email: z.string().trim().email("请输入有效邮箱").max(160),
  company: z.string().trim().max(120).default(""),
  subject: trimmedRequired("联系主题", 120),
  range: z.string().trim().max(80).default(""),
  message: trimmedRequired("详细描述", 3000),
  note: trimmedRequired("备注", 1000),
  website: z.string().trim().max(200).default(""),
});

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;

type ContactParseResult =
  | { success: true; data: ContactSubmission }
  | {
      success: false;
      fieldErrors: Record<string, string[] | undefined>;
      isSpam: boolean;
    };

export function parseContactSubmission(input: unknown): ContactParseResult {
  const result = contactSubmissionSchema.safeParse(input);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors,
      isSpam: false,
    };
  }

  if (result.data.website) {
    return { success: false, fieldErrors: {}, isSpam: true };
  }

  return { success: true, data: result.data };
}
