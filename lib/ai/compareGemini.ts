import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { EnvironmentalProfile } from "../types/environmental";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "YOUR_API";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

export const ComparativeAnalysisSchema = z.object({
  overallSynthesis: z.string(),
  bestLocation: z.string(),
  worstLocation: z.string(),
  rankings: z.array(
    z.object({
      locationName: z.string(),
      aqi: z.number(),
      rank: z.number(),
      status: z.string(),
      verdict: z.string(),
    })
  ),
  keyDifferences: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type ComparativeAnalysis = z.infer<typeof ComparativeAnalysisSchema>;

export async function generateComparativeBrief(
  profiles: EnvironmentalProfile[]
): Promise<ComparativeAnalysis> {
  if (profiles.length < 2) {
    throw new Error("At least 2 profiles are required for comparative analysis");
  }

  const profilesSummary = profiles
    .map(
      (p, i) => `
SECTOR [${i + 1}]: ${p.location.name} (${p.location.latitude.toFixed(2)}°N, ${p.location.longitude.toFixed(2)}°E)
- Air Quality: US AQI ${p.airQuality.usAqi} (${p.airQuality.category.label})
- Dominant Pollutant: ${p.airQuality.dominantPollutant}
- PM2.5: ${p.airQuality.pollutants.pm2_5?.value ?? 0} µg/m³
- PM10: ${p.airQuality.pollutants.pm10?.value ?? 0} µg/m³
- Temperature: ${p.weather.temperature}°C (Feels: ${p.weather.apparentTemperature}°C)
- Humidity: ${p.weather.relativeHumidity}%
- Wind: ${p.weather.windSpeed} km/h ${p.weather.windCompass}
- Fire Hotspots: ${p.fires.count} detected
`
    )
    .join("\n");

  const prompt = `
You are a senior environmental intelligence officer evaluating side-by-side sector profiles for GeoAir Monitor.
Compare the following ${profiles.length} geographic sectors and provide an authoritative comparative analysis:

${profilesSummary}

TASK:
Produce structured JSON matching these exact keys:
1. "overallSynthesis": 2-3 sentences contrasting atmospheric purity, pollution hotspots, and climate divergence across these sectors.
2. "bestLocation": The designation of the sector with the cleanest air and safest environment.
3. "worstLocation": The designation of the sector facing the highest environmental hazard.
4. "rankings": An array of objects for each sector ordered from best (rank 1) to worst:
   - "locationName": string
   - "aqi": number
   - "rank": number (1, 2, ...)
   - "status": string (e.g. "Optimal", "Acceptable", "Compromised", "Hazardous")
   - "verdict": 1 concise sentence summarizing this sector's condition.
5. "keyDifferences": Array of 2 to 4 bullet points highlighting contrasting pollutants, thermal/fire activity, or meteorological factors.
6. "recommendations": Array of 2 to 3 actionable suggestions for travel, outdoor activity, or operational planning.

Return ONLY valid JSON with no markdown formatting.
`;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const rawJson = JSON.parse(cleaned);

      const parsed = ComparativeAnalysisSchema.safeParse(rawJson);
      if (parsed.success) {
        return parsed.data;
      }
    } catch (e: any) {
      console.warn(`[Gemini Compare] Model ${modelName} error:`, e.message);
    }
  }

  // Deterministic rule-based fallback
  return generateDeterministicComparison(profiles);
}

function generateDeterministicComparison(profiles: EnvironmentalProfile[]): ComparativeAnalysis {
  // Sort from lowest AQI (cleanest) to highest AQI (dirtiest)
  const sorted = [...profiles].sort((a, b) => a.airQuality.usAqi - b.airQuality.usAqi);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const rankings = sorted.map((p, index) => {
    let status = "Acceptable";
    if (p.airQuality.usAqi <= 50) status = "Optimal";
    else if (p.airQuality.usAqi > 150) status = "Hazardous";
    else if (p.airQuality.usAqi > 100) status = "Compromised";

    return {
      locationName: p.location.name,
      aqi: p.airQuality.usAqi,
      rank: index + 1,
      status,
      verdict: `${p.location.name} maintains an AQI of ${p.airQuality.usAqi} dominated by ${p.airQuality.dominantPollutant} with temperature at ${p.weather.temperature}°C.`,
    };
  });

  const diffs: string[] = [
    `AQI variance of ${worst.airQuality.usAqi - best.airQuality.usAqi} points observed between ${best.location.name} (AQI ${best.airQuality.usAqi}) and ${worst.location.name} (AQI ${worst.airQuality.usAqi}).`,
    `Dominant particulate loading differs: ${best.location.name} reports PM2.5 at ${best.airQuality.pollutants.pm2_5?.value ?? 0} µg/m³ vs ${worst.airQuality.pollutants.pm2_5?.value ?? 0} µg/m³ in ${worst.location.name}.`,
  ];

  if (worst.fires.count > 0 || best.fires.count > 0) {
    diffs.push(`Thermal fire anomaly discrepancy: ${worst.location.name} has ${worst.fires.count} active hotspots vs ${best.fires.count} in ${best.location.name}.`);
  }

  return {
    overallSynthesis: `Comparative assessment indicates marked environmental divergence across monitored sectors. ${best.location.name} demonstrates superior air purity with an AQI of ${best.airQuality.usAqi}, whereas ${worst.location.name} records elevated pollutant concentration with an AQI of ${worst.airQuality.usAqi}.`,
    bestLocation: best.location.name,
    worstLocation: worst.location.name,
    rankings,
    keyDifferences: diffs,
    recommendations: [
      `Outdoor athletic and civilian activity is favored in ${best.location.name}.`,
      `Sensitive demographics in ${worst.location.name} should deploy high-efficiency particulate air filtration.`,
      `Track shifting wind vectors between sectors to monitor potential transboundary smoke or dust transport.`,
    ],
  };
}
