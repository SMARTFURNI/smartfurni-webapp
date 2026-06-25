import { z } from "zod";

/**
 * Schema dữ liệu campaign do AI sinh ra.
 * Google Ads giới hạn Responsive Search Ad:
 * - Headline tối đa 30 ký tự.
 * - Description tối đa 90 ký tự.
 */
export const adDataSchema = z.object({
  campaignName: z
    .string()
    .trim()
    .min(3, "campaignName phải có ít nhất 3 ký tự")
    .max(120, "campaignName không nên quá 120 ký tự"),
  budget: z
    .number()
    .positive("budget phải lớn hơn 0")
    .finite("budget phải là số hợp lệ"),
  keywords: z
    .array(z.string().trim().min(2, "keyword quá ngắn").max(80, "keyword quá dài"))
    .min(5, "Cần tối thiểu 5 keywords")
    .max(50, "Không nên vượt quá 50 keywords"),
  negativeKeywords: z
    .array(z.string().trim().min(2).max(80))
    .min(5, "Cần tối thiểu 5 negative keywords")
    .max(30, "Không nên vượt quá 30 negative keywords")
    .default([]),
  headlines: z
    .array(z.string().trim().min(1).max(30, "Headline tối đa 30 ký tự"))
    .min(3, "Cần tối thiểu 3 headlines")
    .max(15, "Responsive Search Ad tối đa 15 headlines"),
  descriptions: z
    .array(z.string().trim().min(1).max(90, "Description tối đa 90 ký tự"))
    .min(2, "Cần tối thiểu 2 descriptions")
    .max(4, "Responsive Search Ad tối đa 4 descriptions"),
});

export type AdData = z.infer<typeof adDataSchema>;

export interface PromotionalProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  landingPageUrl: string;
}
