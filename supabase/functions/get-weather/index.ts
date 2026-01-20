import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cameroon cities with coordinates
const CAMEROON_CITIES: Record<string, { lat: number; lon: number; name: string }> = {
  "adamaoua": { lat: 7.3167, lon: 13.5833, name: "Ngaoundéré" },
  "centre": { lat: 3.8667, lon: 11.5167, name: "Yaoundé" },
  "est": { lat: 4.0333, lon: 14.0333, name: "Bertoua" },
  "extreme-nord": { lat: 10.5917, lon: 14.3167, name: "Maroua" },
  "littoral": { lat: 4.0503, lon: 9.7000, name: "Douala" },
  "nord": { lat: 9.3000, lon: 13.3833, name: "Garoua" },
  "nord-ouest": { lat: 5.9500, lon: 10.1500, name: "Bamenda" },
  "ouest": { lat: 5.4833, lon: 10.4167, name: "Bafoussam" },
  "sud": { lat: 2.9333, lon: 11.1500, name: "Ebolowa" },
  "sud-ouest": { lat: 4.1500, lon: 9.2333, name: "Buéa" },
};

interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  description: string;
  icon: string;
  location: string;
  rain_probability: number;
  agricultural_advice: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { region = "centre", language = "fr" } = await req.json();

    const city = CAMEROON_CITIES[region] || CAMEROON_CITIES["centre"];
    
    // Use Open-Meteo API (free, no API key required)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=precipitation_probability_max&timezone=Africa%2FDouala`;

    const response = await fetch(weatherUrl);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;
    const daily = data.daily;

    // Map weather codes to descriptions
    const weatherDescriptions: Record<number, { fr: string; en: string; icon: string }> = {
      0: { fr: "Ciel dégagé", en: "Clear sky", icon: "sun" },
      1: { fr: "Principalement dégagé", en: "Mainly clear", icon: "sun" },
      2: { fr: "Partiellement nuageux", en: "Partly cloudy", icon: "cloud-sun" },
      3: { fr: "Couvert", en: "Overcast", icon: "cloud" },
      45: { fr: "Brouillard", en: "Fog", icon: "cloud-fog" },
      48: { fr: "Brouillard givrant", en: "Depositing rime fog", icon: "cloud-fog" },
      51: { fr: "Bruine légère", en: "Light drizzle", icon: "cloud-drizzle" },
      53: { fr: "Bruine modérée", en: "Moderate drizzle", icon: "cloud-drizzle" },
      55: { fr: "Bruine dense", en: "Dense drizzle", icon: "cloud-drizzle" },
      61: { fr: "Pluie légère", en: "Light rain", icon: "cloud-rain" },
      63: { fr: "Pluie modérée", en: "Moderate rain", icon: "cloud-rain" },
      65: { fr: "Forte pluie", en: "Heavy rain", icon: "cloud-rain" },
      80: { fr: "Averses légères", en: "Light showers", icon: "cloud-rain" },
      81: { fr: "Averses modérées", en: "Moderate showers", icon: "cloud-rain" },
      82: { fr: "Fortes averses", en: "Violent showers", icon: "cloud-rain" },
      95: { fr: "Orage", en: "Thunderstorm", icon: "cloud-lightning" },
      96: { fr: "Orage avec grêle", en: "Thunderstorm with hail", icon: "cloud-lightning" },
      99: { fr: "Orage violent", en: "Severe thunderstorm", icon: "cloud-lightning" },
    };

    const weatherCode = current.weather_code || 0;
    const weatherInfo = weatherDescriptions[weatherCode] || weatherDescriptions[0];

    // Generate agricultural advice based on weather
    const generateAdvice = (temp: number, humidity: number, rainProb: number, lang: string): string => {
      if (lang === "fr") {
        if (rainProb > 70) {
          return "🌧️ Forte probabilité de pluie. Reportez les traitements phytosanitaires.";
        } else if (temp > 35) {
          return "🌡️ Chaleur excessive. Arrosez tôt le matin ou en soirée.";
        } else if (humidity > 85) {
          return "💧 Humidité élevée. Surveillez les maladies fongiques.";
        } else if (temp >= 25 && temp <= 32 && rainProb < 30) {
          return "☀️ Conditions idéales pour le travail au champ.";
        } else {
          return "📋 Conditions normales pour les activités agricoles.";
        }
      } else {
        if (rainProb > 70) {
          return "🌧️ High rain probability. Postpone pesticide treatments.";
        } else if (temp > 35) {
          return "🌡️ Excessive heat. Water early morning or evening.";
        } else if (humidity > 85) {
          return "💧 High humidity. Watch for fungal diseases.";
        } else if (temp >= 25 && temp <= 32 && rainProb < 30) {
          return "☀️ Ideal conditions for field work.";
        } else {
          return "📋 Normal conditions for agricultural activities.";
        }
      }
    };

    const rainProbability = daily?.precipitation_probability_max?.[0] || 0;

    const weatherData: WeatherData = {
      temp: Math.round(current.temperature_2m),
      feels_like: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      wind_speed: Math.round(current.wind_speed_10m),
      description: weatherInfo[language as "fr" | "en"] || weatherInfo.fr,
      icon: weatherInfo.icon,
      location: `${city.name}, ${region.charAt(0).toUpperCase() + region.slice(1).replace("-", " ")}`,
      rain_probability: rainProbability,
      agricultural_advice: generateAdvice(
        current.temperature_2m,
        current.relative_humidity_2m,
        rainProbability,
        language
      ),
    };

    return new Response(
      JSON.stringify({
        success: true,
        weather: weatherData,
        updated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching weather:", error);
    return new Response(
      JSON.stringify({ error: "Impossible de récupérer la météo" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
