import { z } from "zod";

const trimmedOptional = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label}不能超过 ${max} 个字符`);

const optionalEmail = z
  .string()
  .trim()
  .max(160, "邮箱不能超过 160 个字符")
  .refine((value) => value === "" || z.string().email().safeParse(value).success, {
    message: "请输入有效邮箱",
  })
  .default("");

const contactSubmissionSchema = z.object({
  type: z.enum(["hiring", "commercial"]),
  name: trimmedOptional("姓名", 80).default(""),
  email: optionalEmail,
  company: trimmedOptional("公司", 120).default(""),
  subject: trimmedOptional("联系主题", 120).default(""),
  range: trimmedOptional("范围", 80).default(""),
  message: trimmedOptional("详细描述", 3000).default(""),
  note: trimmedOptional("备注", 1000).default(""),
  website: trimmedOptional("Website", 200).default(""),
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
