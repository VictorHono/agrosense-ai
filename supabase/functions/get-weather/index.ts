import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cameroon cities with coordinates (fallback)
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
  altitude?: number;
  climate_zone?: string;
  soil_moisture_index?: number;
  uv_index?: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  regionName: string;
  nearestCity: string;
}

// Determine Cameroon region from coordinates
function getCameroonRegionFromCoords(lat: number, lon: number): {
  region: string;
  regionName: string;
  nearestCity: string;
} {
  const regions = [
    { id: 'extreme-nord', name: 'Extrême-Nord', city: 'Maroua', lat: 10.5917, lon: 14.3167 },
    { id: 'nord', name: 'Nord', city: 'Garoua', lat: 9.3000, lon: 13.3833 },
    { id: 'adamaoua', name: 'Adamaoua', city: 'Ngaoundéré', lat: 7.3167, lon: 13.5833 },
    { id: 'centre', name: 'Centre', city: 'Yaoundé', lat: 3.8667, lon: 11.5167 },
    { id: 'est', name: 'Est', city: 'Bertoua', lat: 4.0333, lon: 14.0333 },
    { id: 'littoral', name: 'Littoral', city: 'Douala', lat: 4.0503, lon: 9.7000 },
    { id: 'nord-ouest', name: 'Nord-Ouest', city: 'Bamenda', lat: 5.9500, lon: 10.1500 },
    { id: 'ouest', name: 'Ouest', city: 'Bafoussam', lat: 5.4833, lon: 10.4167 },
    { id: 'sud', name: 'Sud', city: 'Ebolowa', lat: 2.9333, lon: 11.1500 },
    { id: 'sud-ouest', name: 'Sud-Ouest', city: 'Buéa', lat: 4.1500, lon: 9.2333 },
  ];

  let nearestRegion = regions[3]; // Default to Centre
  let minDistance = Infinity;

  for (const region of regions) {
    const dLat = (lat - region.lat) * Math.PI / 180;
    const dLon = (lon - region.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(lat * Math.PI / 180) * Math.cos(region.lat * Math.PI / 180) * 
              Math.sin(dLon / 2) ** 2;
    const distance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 6371;
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestRegion = region;
    }
  }

  return {
    region: nearestRegion.id,
    regionName: nearestRegion.name,
    nearestCity: nearestRegion.city,
  };
}

// Get climate zone based on coordinates and altitude
function getClimateZone(lat: number, altitude: number | null, lang: string): {
  zone: string;
  characteristics: string[];
} {
  const alt = altitude ?? 0;
  
  if (lat > 8) {
    return {
      zone: lang === "fr" ? "Soudano-sahélienne" : "Sudano-Sahelian",
      characteristics: lang === "fr" 
        ? ["Saison sèche longue", "Températures élevées", "Pluviométrie faible"]
        : ["Long dry season", "High temperatures", "Low rainfall"],
    };
  }
  
  if (lat > 6 && alt > 800) {
    return {
      zone: lang === "fr" ? "Altitude tropicale" : "Tropical highland",
      characteristics: lang === "fr"
        ? ["Climat tempéré", "Températures modérées", "Propice à l'élevage"]
        : ["Temperate climate", "Moderate temperatures", "Good for livestock"],
    };
  }
  
  if (alt > 1000) {
    return {
      zone: lang === "fr" ? "Hautes terres de l'Ouest" : "Western Highlands",
      characteristics: lang === "fr"
        ? ["Climat frais", "Humidité élevée", "Idéal pour café, thé, légumes"]
        : ["Cool climate", "High humidity", "Ideal for coffee, tea, vegetables"],
    };
  }
  
  if (lat < 5 && alt < 500) {
    return {
      zone: lang === "fr" ? "Forestière équatoriale" : "Equatorial forest",
      characteristics: lang === "fr"
        ? ["Forêt tropicale humide", "Pluies abondantes", "Cacao, palmier, hévéa"]
        : ["Tropical rainforest", "Heavy rainfall", "Cocoa, palm, rubber"],
    };
  }
  
  return {
    zone: lang === "fr" ? "Forestière guinéenne" : "Guinean forest",
    characteristics: lang === "fr"
      ? ["Deux saisons de pluies", "Cultures vivrières variées"]
      : ["Two rainy seasons", "Various food crops"],
  };
}

// Generate agricultural advice based on weather, location and altitude
function generateAdvice(
  temp: number, 
  humidity: number, 
  rainProb: number, 
  altitude: number | null,
  lat: number,
  uvIndex: number,
  lang: string
): string {
  const alt = altitude ?? 0;
  const advices: string[] = [];

  if (lang === "fr") {
    // Temperature-based advice
    if (temp > 35) {
      advices.push("🌡️ Chaleur excessive! Arrosez tôt le matin (5h-7h) ou en soirée (17h-19h).");
    } else if (temp > 30 && humidity < 40) {
      advices.push("☀️ Temps chaud et sec. Paillage recommandé pour conserver l'humidité.");
    }

    // Rain-based advice
    if (rainProb > 70) {
      advices.push("🌧️ Forte probabilité de pluie. Reportez les traitements phytosanitaires et la fertilisation.");
    } else if (rainProb > 40) {
      advices.push("🌦️ Risque de pluie. Préparez vos parcelles pour la collecte d'eau.");
    }

    // Humidity-based advice
    if (humidity > 85) {
      advices.push("💧 Humidité très élevée. Surveillez attentivement les maladies fongiques (mildiou, oïdium).");
    }

    // Altitude-specific advice
    if (alt > 1200) {
      advices.push("🏔️ Zone d'altitude: attention aux gelées matinales. Protégez les jeunes plants.");
    } else if (alt > 800) {
      advices.push("⛰️ Zone de moyenne altitude. Conditions favorables pour cultures maraîchères.");
    }

    // UV-based advice
    if (uvIndex > 8) {
      advices.push("☀️ Indice UV très élevé. Protégez-vous et évitez les travaux entre 10h-15h.");
    }

    // Northern zone specific
    if (lat > 8) {
      advices.push("🏜️ Zone sahélienne: optimisez l'irrigation goutte-à-goutte et les techniques de zaï.");
    }

    // Optimal conditions
    if (temp >= 22 && temp <= 30 && rainProb < 40 && humidity >= 50 && humidity <= 75) {
      advices.unshift("✅ Conditions optimales pour le travail au champ et les plantations.");
    }
  } else {
    // English version
    if (temp > 35) {
      advices.push("🌡️ Excessive heat! Water early morning (5-7am) or evening (5-7pm).");
    } else if (temp > 30 && humidity < 40) {
      advices.push("☀️ Hot and dry. Mulching recommended to retain moisture.");
    }

    if (rainProb > 70) {
      advices.push("🌧️ High rain probability. Postpone pesticide treatments and fertilization.");
    } else if (rainProb > 40) {
      advices.push("🌦️ Rain risk. Prepare your plots for water collection.");
    }

    if (humidity > 85) {
      advices.push("💧 Very high humidity. Watch carefully for fungal diseases.");
    }

    if (alt > 1200) {
      advices.push("🏔️ Highland zone: beware of morning frost. Protect young seedlings.");
    } else if (alt > 800) {
      advices.push("⛰️ Mid-altitude zone. Favorable for vegetable crops.");
    }

    if (uvIndex > 8) {
      advices.push("☀️ Very high UV index. Protect yourself, avoid work 10am-3pm.");
    }

    if (lat > 8) {
      advices.push("🏜️ Sahel zone: optimize drip irrigation and zaï techniques.");
    }

    if (temp >= 22 && temp <= 30 && rainProb < 40 && humidity >= 50 && humidity <= 75) {
      advices.unshift("✅ Optimal conditions for fieldwork and planting.");
    }
  }

  return advices.length > 0 
    ? advices.slice(0, 2).join(" ") 
    : (lang === "fr" ? "📋 Conditions normales pour les activités agricoles." : "📋 Normal conditions for agricultural activities.");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      latitude, 
      longitude, 
      altitude = null,
      accuracy = null,
      region = null, // Fallback if no coordinates
      language = "fr" 
    } = body;

    console.log("Weather request - Lat:", latitude, "Lon:", longitude, "Alt:", altitude, "Region:", region);

    let lat: number;
    let lon: number;
    let locationName: string;
    let regionInfo: { region: string; regionName: string; nearestCity: string };

    // Use coordinates if provided, otherwise fallback to region
    if (latitude !== undefined && longitude !== undefined) {
      lat = latitude;
      lon = longitude;
      regionInfo = getCameroonRegionFromCoords(lat, lon);
      
      // Use reverse geocoding approximation
      const distanceToCity = Math.sqrt(
        Math.pow(lat - CAMEROON_CITIES[regionInfo.region]?.lat || 0, 2) + 
        Math.pow(lon - CAMEROON_CITIES[regionInfo.region]?.lon || 0, 2)
      ) * 111; // Approximate km
      
      if (distanceToCity < 15) {
        locationName = `${regionInfo.nearestCity}, ${regionInfo.regionName}`;
      } else {
        locationName = `Près de ${regionInfo.nearestCity}, ${regionInfo.regionName}`;
      }
    } else {
      // Fallback to region
      const city = CAMEROON_CITIES[region || "centre"] || CAMEROON_CITIES["centre"];
      lat = city.lat;
      lon = city.lon;
      locationName = `${city.name}, ${region || "Centre"}`;
      regionInfo = getCameroonRegionFromCoords(lat, lon);
    }

    // Extended Open-Meteo API call with more parameters
    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", lat.toString());
    weatherUrl.searchParams.set("longitude", lon.toString());
    weatherUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index,soil_moisture_0_to_1cm");
    weatherUrl.searchParams.set("daily", "precipitation_probability_max,temperature_2m_max,temperature_2m_min");
    weatherUrl.searchParams.set("timezone", "Africa/Douala");
    
    // Add elevation if user provides altitude
    if (altitude !== null) {
      weatherUrl.searchParams.set("elevation", altitude.toString());
    }

    console.log("Fetching weather from:", weatherUrl.toString());

    const response = await fetch(weatherUrl.toString());
    
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
    const rainProbability = daily?.precipitation_probability_max?.[0] || 0;
    const uvIndex = current.uv_index || 0;
    const soilMoisture = current.soil_moisture_0_to_1cm || null;

    // Get climate zone info
    const climateZone = getClimateZone(lat, altitude, language);

    // Generate comprehensive agricultural advice
    const agriculturalAdvice = generateAdvice(
      current.temperature_2m,
      current.relative_humidity_2m,
      rainProbability,
      altitude,
      lat,
      uvIndex,
      language
    );

    const weatherData: WeatherData = {
      temp: Math.round(current.temperature_2m),
      feels_like: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      wind_speed: Math.round(current.wind_speed_10m),
      description: weatherInfo[language as "fr" | "en"] || weatherInfo.fr,
      icon: weatherInfo.icon,
      location: locationName,
      rain_probability: rainProbability,
      agricultural_advice: agriculturalAdvice,
      altitude: altitude,
      climate_zone: climateZone.zone,
      soil_moisture_index: soilMoisture,
      uv_index: uvIndex,
      coordinates: {
        latitude: lat,
        longitude: lon,
      },
    };

    console.log("Weather response ready:", weatherData.location, weatherData.temp + "°C");

    return new Response(
      JSON.stringify({
        success: true,
        weather: weatherData,
        location_info: {
          region: regionInfo.region,
          regionName: regionInfo.regionName,
          nearestCity: regionInfo.nearestCity,
          climateZone: climateZone.zone,
          climateCharacteristics: climateZone.characteristics,
          altitude: altitude,
          accuracy: accuracy,
          coordinates: { latitude: lat, longitude: lon },
        },
        updated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching weather:", error);
    return new Response(
      JSON.stringify({ error: "Impossible de récupérer la météo", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
