import { z } from "zod";

export const AnalystBriefSchema = z.object({
  summary: z.string(),
  riskLevel: z.enum(["LOW", "MODERATE", "ELEVATED", "HIGH", "CRITICAL"]),
  keyConcerns: z.array(z.string()),
  healthPrecautions: z.array(z.string()),
  trendInterpretation: z.string(),
  confidenceScore: z.number().min(50).max(99),
});

export type AnalystBrief = z.infer<typeof AnalystBriefSchema>;
