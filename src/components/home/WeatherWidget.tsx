import { Cloud, Sun, Droplets, Wind } from 'lucide-react';

export function WeatherWidget() {
  // Mock weather data - would be fetched from API
  const weather = {
    temp: 28,
    condition: 'Partiellement nuageux',
    humidity: 65,
    wind: 12,
    location: 'Yaoundé, Centre',
  };

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-br from-info/20 to-info/5 border border-info/20">
      <div className="flex items-center justify-between">
        {/* Main Weather */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center">
            <Sun className="w-6 h-6 text-info" />
            <Cloud className="w-4 h-4 text-info/60 -ml-2 mt-2" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{weather.temp}°</span>
              <span className="text-sm text-muted-foreground">C</span>
            </div>
            <p className="text-xs text-muted-foreground">{weather.condition}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="text-center">
            <Droplets className="w-4 h-4 text-info mx-auto mb-1" />
            <span className="text-xs text-muted-foreground">{weather.humidity}%</span>
          </div>
          <div className="text-center">
            <Wind className="w-4 h-4 text-info mx-auto mb-1" />
            <span className="text-xs text-muted-foreground">{weather.wind} km/h</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-right">
        📍 {weather.location}
      </p>
    </div>
  );
}
