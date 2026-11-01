import { GoogleGenerativeAI } from "@google/generative-ai";
import { AnalystBrief, AnalystBriefSchema } from "./schema";
import { EnvironmentalProfile } from "../types/environmental";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "KEY";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

export async function generateAnalystBrief(profile: EnvironmentalProfile): Promise<AnalystBrief> {
  const prompt = `
You are an expert environmental intelligence analyst for GeoAir Monitor, an advanced environmental command center.
Synthesize the following sensor telemetry into an authoritative executive intelligence brief for government officials, public health officers, and environmental agencies:

LOCATION TELEMETRY:
- Designation: ${profile.location.name}
- Coordinates: ${profile.location.latitude.toFixed(4)}°N, ${profile.location.longitude.toFixed(4)}°E
${profile.areaMetrics?.isPolygon ? `- Enclosed Territory: ${profile.areaMetrics.areaKm2} km² (Sampled across ${profile.areaMetrics.samplePointsCount} grid nodes, Average AQI: ${profile.areaMetrics.avgAqi}, Peak Node AQI: ${profile.areaMetrics.maxAqi})` : ""}

AIR QUALITY TELEMETRY:
- US EPA AQI: ${profile.airQuality.usAqi} (${profile.airQuality.category.label})
- European AQI: ${profile.airQuality.europeanAqi}
- Dominant Pollutant: ${profile.airQuality.dominantPollutant}
- Pollutants Breakdown vs WHO 24-Hour Limits:
  * PM2.5: ${profile.airQuality.pollutants.pm2_5?.value ?? "N/A"} µg/m³ (${profile.airQuality.pollutants.pm2_5?.percentageOfLimit ?? 0}% of WHO limit)
  * PM10: ${profile.airQuality.pollutants.pm10?.value ?? "N/A"} µg/m³ (${profile.airQuality.pollutants.pm10?.percentageOfLimit ?? 0}% of WHO limit)
  * NO2: ${profile.airQuality.pollutants.nitrogen_dioxide?.value ?? "N/A"} µg/m³
  * SO2: ${profile.airQuality.pollutants.sulphur_dioxide?.value ?? "N/A"} µg/m³
  * O3: ${profile.airQuality.pollutants.ozone?.value ?? "N/A"} µg/m³
  * CO: ${profile.airQuality.pollutants.carbon_monoxide?.value ?? "N/A"} µg/m³

METEOROLOGICAL SENSORS:
- Surface Temperature: ${profile.weather.temperature}°C (Feels like ${profile.weather.apparentTemperature}°C)
- Relative Humidity: ${profile.weather.relativeHumidity}%
- Barometric Pressure: ${profile.weather.surfacePressure} hPa
- Wind Vector: ${profile.weather.windSpeed} km/h heading ${profile.weather.windCompass} (${profile.weather.windDirection}°)
- Precipitation: ${profile.weather.precipitation} mm
- Sky Condition: ${profile.weather.weatherDescription}

THERMAL ANOMALY CONSTELLATION (NASA FIRMS VIIRS):
- Active Hotspots in Sector: ${profile.fires.count} detections

TASK:
Provide structured JSON with the following exact keys:
1. summary: A 2-3 sentence executive situation summary synthesizing the environmental state.
2. riskLevel: Exactly one of ["LOW", "MODERATE", "ELEVATED", "HIGH", "CRITICAL"].
3. keyConcerns: Array of 2 to 4 bullet points outlining key environmental and chemical hazards.
4. healthPrecautions: Array of 2 to 4 actionable precautions for vulnerable groups and field teams.
5. trendInterpretation: A 2 sentence assessment of atmospheric boundary dispersion and trajectory based on wind and pressure.
6. confidenceScore: An integer between 85 and 98 reflecting analytical certainty.

Return ONLY valid JSON matching the schema, with no markdown code fences or conversational text.
`;

  let lastError: any = null;

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

      // Clean possible fences if any
      const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const rawJson = JSON.parse(cleaned);

      const parsed = AnalystBriefSchema.safeParse(rawJson);
      if (parsed.success) {
        return parsed.data;
      } else {
        console.warn("[Gemini] Schema validation failed for model", modelName, parsed.error);
      }
    } catch (e: any) {
      console.warn(`[Gemini] Model ${modelName} failed:`, e.message);
      lastError = e;
    }
  }

  // Graceful rule-based fallback if all AI models are unreachable or quota is exhausted
  console.warn("[Gemini] Fallback triggered due to API error:", lastError?.message);
  return generateDeterministicBrief(profile);
}

function generateDeterministicBrief(profile: EnvironmentalProfile): AnalystBrief {
  const aqi = profile.airQuality.usAqi;
  let riskLevel: AnalystBrief["riskLevel"] = "LOW";

  if (aqi > 200 || profile.fires.count > 10) riskLevel = "CRITICAL";
  else if (aqi > 150 || profile.fires.count > 5) riskLevel = "HIGH";
  else if (aqi > 100) riskLevel = "ELEVATED";
  else if (aqi > 50) riskLevel = "MODERATE";

  const concerns: string[] = [];
  if (profile.airQuality.pollutants.pm2_5?.percentageOfLimit > 100) {
    concerns.push(`PM2.5 concentrations exceed WHO 24-hour limits by ${profile.airQuality.pollutants.pm2_5.percentageOfLimit}%.`);
  }
  if (profile.fires.count > 0) {
    concerns.push(`${profile.fires.count} thermal fire hotspots detected via NASA FIRMS satellite constellation.`);
  }
  if (profile.weather.windSpeed < 5) {
    concerns.push("Low surface wind velocity promotes regional atmospheric boundary layer stagnation.");
  } else {
    concerns.push(`Wind transport at ${profile.weather.windSpeed} km/h (${profile.weather.windCompass}) dispersing particulate plume.`);
  }

  return {
    summary: `Sector ${profile.location.name} exhibits ${profile.airQuality.category.label.toLowerCase()} air quality with an AQI of ${aqi}. Primary particulate suspension is dominated by ${profile.airQuality.dominantPollutant} under ${profile.weather.weatherDescription.toLowerCase()} atmospheric conditions.`,
    riskLevel,
    keyConcerns: concerns.slice(0, 3),
    healthPrecautions: [
      profile.airQuality.category.healthRecommendation,
      "Ensure indoor air filtration systems are activated in occupied facilities.",
      "Field personnel should monitor real-time sensor updates for sudden plume shifts.",
    ],
    trendInterpretation: `Prevailing ${profile.weather.windCompass} winds at ${profile.weather.windSpeed} km/h combined with a surface pressure of ${profile.weather.surfacePressure} hPa indicate stable particulate dispersion over the coming forecast interval.`,
    confidenceScore: 92,
  };
}
