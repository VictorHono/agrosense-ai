import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Camera, BarChart3, Loader2, Calendar, ChevronRight, X, 
  MapPin, Leaf, AlertTriangle, ThermometerSun, TrendingUp,
  CircleDollarSign, Award, Activity, Download, Printer,
  Shield, Bug, Droplets, Sun, Wind, Clock, CheckCircle2,
  FlaskConical, Sprout, Heart, AlertCircle, Info, FileText
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ActivityRecord {
  id: string;
  activity_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

// Enhanced Diagnosis Detail Modal Component
function DiagnosisDetailModal({ 
  activity, 
  onClose 
}: { 
  activity: ActivityRecord; 
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const meta = activity.metadata || {};
  
  const crop = String(meta.crop || 'Culture non identifiée');
  const disease = String(meta.disease_name || meta.disease || 'Non détecté');
  const confidence = Number(meta.confidence || 0);
  const severity = String(meta.severity || 'unknown');
  const isHealthy = Boolean(meta.is_healthy);
  const region = String(meta.region || '-');
  const treatments = Array.isArray(meta.treatments) ? meta.treatments : [];
  const symptoms = Array.isArray(meta.symptoms) ? meta.symptoms : [];
  const causes = Array.isArray(meta.causes) ? meta.causes : [];
  const prevention = Array.isArray(meta.prevention) ? meta.prevention : [];
  const description = String(meta.description || '');
  const altitude = meta.altitude ? Number(meta.altitude) : null;
  const climate = String(meta.climate || meta.climate_zone || '');
  const imageUrl = String(meta.image_url || '');
  const analysisDate = new Date(activity.created_at);
  
  // Extended location data
  const latitude = meta.latitude ? Number(meta.latitude) : null;
  const longitude = meta.longitude ? Number(meta.longitude) : null;
  const nearestCity = String(meta.nearest_city || meta.nearestCity || '');
  const season = String(meta.season || '');
  
  // Weather conditions
  const weatherRaw = meta.weather_conditions || meta.weather || {};
  const weather = typeof weatherRaw === 'object' && weatherRaw !== null ? weatherRaw as Record<string, unknown> : {};
  const temperature = typeof weather.temperature === 'number' ? weather.temperature : null;
  const humidity = typeof weather.humidity === 'number' ? weather.humidity : null;
  const rainfall = typeof weather.rainfall === 'number' ? weather.rainfall : null;
  const windSpeed = typeof weather.wind_speed === 'number' ? weather.wind_speed : null;
  const weatherDescription = String(weather.description || weather.condition || '');
  
  // Source information
  const fromLearning = Boolean(meta.from_learning);
  const fromDatabase = Boolean(meta.from_database);
  const cropLocal = String(meta.crop_local || meta.detected_crop_local || '');
  const diseaseLocal = String(meta.disease_local || meta.local_name || '');

  // Parse treatments into biological and chemical if possible
  const biologicalTreatments = treatments.filter((t: unknown) => 
    typeof t === 'string' && (t.toLowerCase().includes('bio') || t.toLowerCase().includes('naturel') || t.toLowerCase().includes('organique'))
  );
  const chemicalTreatments = treatments.filter((t: unknown) => 
    typeof t === 'string' && !biologicalTreatments.includes(t)
  );

  const getSeverityInfo = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'low': 
        return { 
          color: 'bg-green-500', 
          bgColor: 'bg-green-500/10',
          textColor: 'text-green-600',
          label: 'Faible', 
          description: 'Impact limité sur la culture. Intervention préventive recommandée.',
          icon: Shield,
          percent: 25
        };
      case 'medium': 
        return { 
          color: 'bg-yellow-500', 
          bgColor: 'bg-yellow-500/10',
          textColor: 'text-yellow-600',
          label: 'Modéré', 
          description: 'Surveillance requise. Traitement conseillé sous 7 jours.',
          icon: AlertCircle,
          percent: 50
        };
      case 'high': 
        return { 
          color: 'bg-orange-500', 
          bgColor: 'bg-orange-500/10',
          textColor: 'text-orange-600',
          label: 'Élevé', 
          description: 'Risque significatif. Traitement urgent recommandé sous 48h.',
          icon: AlertTriangle,
          percent: 75
        };
      case 'critical': 
        return { 
          color: 'bg-red-500', 
          bgColor: 'bg-red-500/10',
          textColor: 'text-red-600',
          label: 'Critique', 
          description: 'Danger immédiat. Intervention immédiate nécessaire.',
          icon: Bug,
          percent: 100
        };
      default: 
        return { 
          color: 'bg-muted', 
          bgColor: 'bg-muted/50',
          textColor: 'text-muted-foreground',
          label: 'Inconnu', 
          description: 'Niveau de sévérité non déterminé.',
          icon: Info,
          percent: 0
        };
    }
  };

  const severityInfo = getSeverityInfo(severity);
  const SeverityIcon = severityInfo.icon;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Diagnostic AgroCamer - ${crop} - ${format(analysisDate, 'dd/MM/yyyy')}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              color: #1a1a1a;
              line-height: 1.5;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #16a34a; 
              padding-bottom: 20px; 
              margin-bottom: 20px;
            }
            .logo { font-size: 28px; font-weight: bold; color: #16a34a; }
            .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
            .date { color: #888; font-size: 12px; margin-top: 10px; }
            
            .section { 
              margin-bottom: 20px; 
              padding: 15px; 
              border: 1px solid #e5e5e5; 
              border-radius: 8px;
              page-break-inside: avoid;
            }
            .section-title { 
              font-size: 14px; 
              font-weight: 600; 
              color: #16a34a; 
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .section-content { font-size: 13px; color: #333; }
            
            .main-info { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 15px; 
              margin-bottom: 20px;
            }
            .info-card {
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }
            .info-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
            .info-value { font-size: 16px; font-weight: 600; margin-top: 5px; }
            
            .severity-box {
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .severity-low { background: #dcfce7; border: 1px solid #16a34a; }
            .severity-medium { background: #fef9c3; border: 1px solid #ca8a04; }
            .severity-high { background: #fed7aa; border: 1px solid #ea580c; }
            .severity-critical { background: #fecaca; border: 1px solid #dc2626; }
            
            .treatment-list { list-style: none; }
            .treatment-item { 
              padding: 8px 12px; 
              margin: 5px 0; 
              background: #f3f4f6; 
              border-radius: 6px;
              font-size: 13px;
            }
            .treatment-bio { border-left: 3px solid #16a34a; }
            .treatment-chem { border-left: 3px solid #3b82f6; }
            
            .symptom-tag {
              display: inline-block;
              padding: 4px 10px;
              margin: 3px;
              background: #e5e7eb;
              border-radius: 20px;
              font-size: 12px;
            }
            
            .confidence-bar {
              height: 8px;
              background: #e5e7eb;
              border-radius: 4px;
              overflow: hidden;
              margin-top: 8px;
            }
            .confidence-fill {
              height: 100%;
              background: #16a34a;
              border-radius: 4px;
            }
            
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e5e5;
              text-align: center;
              font-size: 11px;
              color: #888;
            }
            
            .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            
            @media print {
              body { padding: 10px; }
              .section { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🌱 AgroCamer</div>
            <div class="subtitle">Rapport de Diagnostic Phytosanitaire</div>
            <div class="date">Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}</div>
          </div>
          
          <div class="main-info">
            <div class="info-card">
              <div class="info-label">Culture analysée</div>
              <div class="info-value">${crop}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Date du diagnostic</div>
              <div class="info-value">${format(analysisDate, 'dd MMMM yyyy', { locale: fr })}</div>
            </div>
          </div>
          
          ${!isHealthy ? `
            <div class="severity-box severity-${severity.toLowerCase()}">
              <div style="font-weight: 600; font-size: 16px; margin-bottom: 5px;">
                ⚠️ ${disease}
              </div>
              <div style="font-size: 13px;">
                Niveau de sévérité: <strong>${severityInfo.label}</strong> - ${severityInfo.description}
              </div>
            </div>
          ` : `
            <div class="severity-box severity-low">
              <div style="font-weight: 600; font-size: 16px; margin-bottom: 5px;">
                ✅ Plante en bonne santé
              </div>
              <div style="font-size: 13px;">
                Aucune maladie ou anomalie détectée lors de l'analyse.
              </div>
            </div>
          `}
          
          ${confidence > 0 ? `
            <div class="section">
              <div class="section-title">📊 Niveau de confiance de l'analyse</div>
              <div class="section-content">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Précision de l'identification</span>
                  <strong style="font-size: 18px; color: #16a34a;">${confidence}%</strong>
                </div>
                <div class="confidence-bar">
                  <div class="confidence-fill" style="width: ${confidence}%"></div>
                </div>
              </div>
            </div>
          ` : ''}
          
          ${description ? `
            <div class="section">
              <div class="section-title">📝 Description détaillée</div>
              <div class="section-content">${description}</div>
            </div>
          ` : ''}
          
          ${symptoms.length > 0 ? `
            <div class="section">
              <div class="section-title">🔍 Symptômes observés</div>
              <div class="section-content">
                ${symptoms.map((s: unknown) => `<span class="symptom-tag">${String(s)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
          
          ${causes.length > 0 ? `
            <div class="section">
              <div class="section-title">🧬 Causes probables</div>
              <div class="section-content">
                <ul style="margin-left: 20px;">
                  ${causes.map((c: unknown) => `<li style="margin: 5px 0;">${String(c)}</li>`).join('')}
                </ul>
              </div>
            </div>
          ` : ''}
          
          ${treatments.length > 0 ? `
            <div class="section">
              <div class="section-title">💊 Traitements recommandés</div>
              <div class="section-content">
                ${biologicalTreatments.length > 0 ? `
                  <div style="margin-bottom: 15px;">
                    <div style="font-size: 12px; font-weight: 600; color: #16a34a; margin-bottom: 8px;">🌿 Traitements biologiques</div>
                    <ul class="treatment-list">
                      ${biologicalTreatments.map((t: unknown) => `<li class="treatment-item treatment-bio">${String(t)}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
                ${chemicalTreatments.length > 0 ? `
                  <div>
                    <div style="font-size: 12px; font-weight: 600; color: #3b82f6; margin-bottom: 8px;">🧪 Traitements chimiques</div>
                    <ul class="treatment-list">
                      ${chemicalTreatments.map((t: unknown) => `<li class="treatment-item treatment-chem">${String(t)}</li>`).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
          
          ${prevention.length > 0 ? `
            <div class="section">
              <div class="section-title">🛡️ Mesures préventives</div>
              <div class="section-content">
                <ul style="margin-left: 20px;">
                  ${prevention.map((p: unknown, i: number) => `<li style="margin: 8px 0;"><strong>${i + 1}.</strong> ${String(p)}</li>`).join('')}
                </ul>
              </div>
            </div>
          ` : ''}
          
          <div class="section">
            <div class="section-title">📍 Informations géographiques</div>
            <div class="section-content two-col">
              <div>
                <div class="info-label">Région</div>
                <div style="font-weight: 500; margin-top: 3px;">${region !== '-' ? region : 'Non spécifiée'}</div>
              </div>
              ${altitude ? `
                <div>
                  <div class="info-label">Altitude</div>
                  <div style="font-weight: 500; margin-top: 3px;">${altitude} m</div>
                </div>
              ` : ''}
              ${climate ? `
                <div>
                  <div class="info-label">Climat</div>
                  <div style="font-weight: 500; margin-top: 3px;">${climate}</div>
                </div>
              ` : ''}
            </div>
          </div>
          
          <div class="footer">
            <p><strong>AgroCamer</strong> - Application d'assistance agricole intelligente</p>
            <p style="margin-top: 5px;">Ce rapport a été généré automatiquement. Pour toute question, consultez un technicien agricole local.</p>
            <p style="margin-top: 5px;">ID du diagnostic: ${activity.id}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-2xl m-0 sm:m-4 animate-in slide-in-from-bottom duration-300 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              isHealthy ? "bg-green-500/10" : severityInfo.bgColor
            )}>
              {isHealthy ? (
                <Heart className="w-6 h-6 text-green-500" />
              ) : (
                <SeverityIcon className={cn("w-6 h-6", severityInfo.textColor)} />
              )}
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Rapport de diagnostic</h2>
              <p className="text-xs text-muted-foreground">
                {format(analysisDate, 'EEEE dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Main Status Card */}
          <div className={cn(
            "rounded-2xl p-5 border-2",
            isHealthy 
              ? "bg-green-500/5 border-green-500/30" 
              : `${severityInfo.bgColor} border-current/20`
          )}>
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0",
                isHealthy ? "bg-green-500/20" : severityInfo.bgColor
              )}>
                {isHealthy ? '✅' : '⚠️'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={isHealthy ? "default" : "destructive"} className="text-xs">
                    {isHealthy ? 'Sain' : severityInfo.label}
                  </Badge>
                  {confidence > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {confidence}% confiance
                    </Badge>
                  )}
                </div>
                <h3 className="font-bold text-xl mt-2 text-foreground">{crop}</h3>
                {!isHealthy && (
                  <p className={cn("font-medium mt-1", severityInfo.textColor)}>
                    {disease}
                  </p>
                )}
              </div>
            </div>
            
            {!isHealthy && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">{severityInfo.description}</p>
              </div>
            )}
          </div>

          {/* Confidence Gauge */}
          {confidence > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Précision de l'analyse</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">{confidence}%</span>
                </div>
                <Progress value={confidence} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  {confidence >= 90 ? 'Identification très fiable' :
                   confidence >= 75 ? 'Identification fiable' :
                   confidence >= 50 ? 'Identification probable - vérification conseillée' :
                   'Faible confiance - consultation expert recommandée'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {description && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Description détaillée</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </CardContent>
            </Card>
          )}

          {/* Severity Breakdown */}
          {!isHealthy && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Niveau de sévérité</span>
                </div>
                <div className="space-y-3">
                  {['low', 'medium', 'high', 'critical'].map((level) => {
                    const info = getSeverityInfo(level);
                    const isActive = level === severity.toLowerCase();
                    return (
                      <div 
                        key={level}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-all",
                          isActive ? info.bgColor : "bg-muted/30 opacity-50"
                        )}
                      >
                        <div className={cn("w-3 h-3 rounded-full", info.color)} />
                        <div className="flex-1">
                          <span className={cn("font-medium text-sm", isActive && info.textColor)}>
                            {info.label}
                          </span>
                        </div>
                        {isActive && <CheckCircle2 className={cn("w-5 h-5", info.textColor)} />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Symptoms */}
          {symptoms.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bug className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Symptômes identifiés</span>
                  <Badge variant="secondary" className="ml-auto">{symptoms.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {symptoms.map((symptom, i) => (
                    <Badge 
                      key={i} 
                      variant="outline"
                      className="bg-destructive/5 text-destructive border-destructive/20"
                    >
                      {String(symptom)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Causes */}
          {causes.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Causes probables</span>
                </div>
                <ul className="space-y-2">
                  {causes.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{String(cause)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Treatments */}
          {treatments.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <ThermometerSun className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Traitements recommandés</span>
                </div>
                
                {biologicalTreatments.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sprout className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">Traitements biologiques</span>
                    </div>
                    <div className="space-y-2 pl-6">
                      {biologicalTreatments.map((treatment, i) => (
                        <div 
                          key={i} 
                          className="flex items-start gap-2 p-3 bg-green-500/5 rounded-lg border-l-2 border-green-500"
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{String(treatment)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {chemicalTreatments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FlaskConical className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600">Traitements chimiques</span>
                    </div>
                    <div className="space-y-2 pl-6">
                      {chemicalTreatments.map((treatment, i) => (
                        <div 
                          key={i} 
                          className="flex items-start gap-2 p-3 bg-blue-500/5 rounded-lg border-l-2 border-blue-500"
                        >
                          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <span className="text-sm">{String(treatment)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Prevention */}
          {prevention.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Mesures préventives</span>
                </div>
                <div className="space-y-3">
                  {prevention.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm">{String(item)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Source Badge */}
          {(fromLearning || fromDatabase) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Source de l'analyse</span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "ml-auto",
                      fromLearning 
                        ? "bg-green-500/10 text-green-600 border-green-500/30" 
                        : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    )}
                  >
                    {fromLearning ? '🧠 Apprentissage local' : '📚 Base expert'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {fromLearning 
                    ? 'Diagnostic basé sur des cas similaires dans votre région' 
                    : 'Diagnostic basé sur la base de données expert'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* GPS Position & Location Details */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="font-semibold">Position & Localisation</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Coordinates */}
                {(latitude !== null && longitude !== null) && (
                  <div className="col-span-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs font-medium">Coordonnées GPS</span>
                    </div>
                    <p className="font-mono text-sm font-medium">
                      {latitude.toFixed(6)}°, {longitude.toFixed(6)}°
                    </p>
                  </div>
                )}

                <div className="p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs">Région</span>
                  </div>
                  <p className="font-medium">{region !== '-' ? region : 'Non spécifiée'}</p>
                </div>
                
                {nearestCity && (
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs">Ville proche</span>
                    </div>
                    <p className="font-medium">{nearestCity}</p>
                  </div>
                )}
                
                {altitude !== null && (
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs">Altitude</span>
                    </div>
                    <p className="font-medium">{altitude} m</p>
                  </div>
                )}
                
                {climate && (
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Sun className="w-4 h-4" />
                      <span className="text-xs">Zone climatique</span>
                    </div>
                    <p className="font-medium">{climate}</p>
                  </div>
                )}
                
                {season && (
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Saison</span>
                    </div>
                    <p className="font-medium capitalize">{season}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weather Conditions */}
          {(temperature !== null || humidity !== null || rainfall !== null || weatherDescription) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <ThermometerSun className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Conditions météorologiques</span>
                </div>
                
                {weatherDescription && (
                  <div className="mb-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/20">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 capitalize">
                      {weatherDescription}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  {temperature !== null && (
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <ThermometerSun className="w-4 h-4" />
                        <span className="text-xs">Température</span>
                      </div>
                      <p className="font-medium">{temperature}°C</p>
                    </div>
                  )}
                  
                  {humidity !== null && (
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Droplets className="w-4 h-4" />
                        <span className="text-xs">Humidité</span>
                      </div>
                      <p className="font-medium">{humidity}%</p>
                    </div>
                  )}
                  
                  {rainfall !== null && (
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Droplets className="w-4 h-4" />
                        <span className="text-xs">Précipitations</span>
                      </div>
                      <p className="font-medium">{rainfall} mm</p>
                    </div>
                  )}
                  
                  {windSpeed !== null && (
                    <div className="p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Wind className="w-4 h-4" />
                        <span className="text-xs">Vent</span>
                      </div>
                      <p className="font-medium">{windSpeed} km/h</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Time */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <span className="font-semibold">Détails de l'analyse</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Date</span>
                  </div>
                  <p className="font-medium">{format(analysisDate, 'dd MMMM yyyy', { locale: fr })}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Heure</span>
                  </div>
                  <p className="font-medium">{format(analysisDate, 'HH:mm', { locale: fr })}</p>
                </div>
                
                {cropLocal && (
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Leaf className="w-4 h-4" />
                      <span className="text-xs">Nom local</span>
                    </div>
                    <p className="font-medium">{cropLocal}</p>
                  </div>
                )}
                
                {diseaseLocal && !isHealthy && (
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Bug className="w-4 h-4" />
                      <span className="text-xs">Maladie (local)</span>
                    </div>
                    <p className="font-medium">{diseaseLocal}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Footer ID */}
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              ID du diagnostic: <code className="bg-muted px-2 py-1 rounded">{activity.id.slice(0, 8)}</code>
            </p>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-border p-4 bg-background">
          <Button onClick={handlePrint} className="w-full gap-2" size="lg">
            <Printer className="w-5 h-5" />
            Télécharger le rapport PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

// Harvest Detail Modal Component
function HarvestDetailModal({ 
  activity, 
  onClose 
}: { 
  activity: ActivityRecord; 
  onClose: () => void;
}) {
  const meta = activity.metadata || {};
  
  const crop = String(meta.crop || 'Culture non identifiée');
  const qualityScore = Number(meta.quality_score || 0);
  const grade = String(meta.grade || '-');
  const market = String(meta.market || '-');
  const region = String(meta.region || '-');
  const priceMin = Number(meta.price_min || 0);
  const priceMax = Number(meta.price_max || 0);
  const yieldPotential = String(meta.yield_potential || 'medium');
  
  // Extended location data
  const latitude = meta.latitude ? Number(meta.latitude) : null;
  const longitude = meta.longitude ? Number(meta.longitude) : null;
  const altitude = meta.altitude ? Number(meta.altitude) : null;
  const nearestCity = String(meta.nearest_city || meta.nearestCity || '');
  const climateZone = String(meta.climate_zone || meta.climateZone || '');
  const season = String(meta.season || '');
  
  // Quality details
  const quality = typeof meta.quality === 'object' && meta.quality ? meta.quality as Record<string, unknown> : {};
  const colorScore = typeof quality.color === 'number' ? quality.color : null;
  const sizeScore = typeof quality.size === 'number' ? quality.size : null;
  const defectsScore = typeof quality.defects === 'number' ? quality.defects : null;
  const uniformityScore = typeof quality.uniformity === 'number' ? quality.uniformity : null;
  const maturityScore = typeof quality.maturity === 'number' ? quality.maturity : null;
  
  // Additional data
  const issuesDetected = Array.isArray(meta.issues_detected) ? meta.issues_detected : [];
  const improvementTips = Array.isArray(meta.improvement_tips) ? meta.improvement_tips : [];
  const storageTips = Array.isArray(meta.storage_tips) ? meta.storage_tips : [];
  const recommendedUse = Array.isArray(meta.recommended_use) ? meta.recommended_use : [];
  const feedback = String(meta.feedback || '');
  
  const analysisDate = new Date(activity.created_at);

  const getGradeColor = (g: string) => {
    switch (g.toUpperCase()) {
      case 'A': return 'text-green-500 bg-green-500/10';
      case 'B': return 'text-yellow-500 bg-yellow-500/10';
      case 'C': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getYieldLabel = (y: string) => {
    switch (y.toLowerCase()) {
      case 'high': case 'excellent': return { label: 'Élevé', color: 'text-green-500' };
      case 'medium': return { label: 'Moyen', color: 'text-yellow-500' };
      case 'low': return { label: 'Faible', color: 'text-red-500' };
      default: return { label: 'Inconnu', color: 'text-muted-foreground' };
    }
  };

  const yieldInfo = getYieldLabel(yieldPotential);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-2xl m-0 sm:m-4 animate-in slide-in-from-bottom duration-300 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-foreground">Analyse de récolte</h2>
              <p className="text-xs text-muted-foreground">
                {format(analysisDate, 'EEEE dd MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Crop & Grade Card */}
          <div className="rounded-2xl p-5 bg-primary/5 border-2 border-primary/20">
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0",
                getGradeColor(grade)
              )}>
                {grade}
              </div>
              <div className="flex-1 min-w-0">
                <Badge variant="outline" className="text-xs mb-2">
                  Grade {grade}
                </Badge>
                <h3 className="font-bold text-xl text-foreground">{crop}</h3>
                <p className={cn("font-medium mt-1", yieldInfo.color)}>
                  Potentiel: {yieldInfo.label}
                </p>
              </div>
            </div>
          </div>

          {/* Quality Score */}
          {qualityScore > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Score de qualité global</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">{qualityScore}/100</span>
                </div>
                <Progress value={qualityScore} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">
                  {qualityScore >= 80 ? 'Excellente qualité - Premium' : 
                   qualityScore >= 60 ? 'Bonne qualité - Standard' : 
                   qualityScore >= 40 ? 'Qualité moyenne - À surveiller' : 'Qualité à améliorer'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Detailed Quality Breakdown */}
          {(colorScore !== null || sizeScore !== null || uniformityScore !== null) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Détails de qualité</span>
                </div>
                <div className="space-y-3">
                  {colorScore !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Couleur</span>
                      <div className="flex items-center gap-2">
                        <Progress value={colorScore} className="h-2 w-24" />
                        <span className="text-sm font-medium w-10 text-right">{colorScore}%</span>
                      </div>
                    </div>
                  )}
                  {sizeScore !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Taille</span>
                      <div className="flex items-center gap-2">
                        <Progress value={sizeScore} className="h-2 w-24" />
                        <span className="text-sm font-medium w-10 text-right">{sizeScore}%</span>
                      </div>
                    </div>
                  )}
                  {uniformityScore !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Uniformité</span>
                      <div className="flex items-center gap-2">
                        <Progress value={uniformityScore} className="h-2 w-24" />
                        <span className="text-sm font-medium w-10 text-right">{uniformityScore}%</span>
                      </div>
                    </div>
                  )}
                  {maturityScore !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Maturité</span>
                      <div className="flex items-center gap-2">
                        <Progress value={maturityScore} className="h-2 w-24" />
                        <span className="text-sm font-medium w-10 text-right">{maturityScore}%</span>
                      </div>
                    </div>
                  )}
                  {defectsScore !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Défauts (moins = mieux)</span>
                      <div className="flex items-center gap-2">
                        <Progress value={100 - defectsScore} className="h-2 w-24" />
                        <span className="text-sm font-medium w-10 text-right">{defectsScore}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Issues Detected */}
          {issuesDetected.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <span className="font-semibold">Problèmes détectés</span>
                  <Badge variant="destructive" className="ml-auto">{issuesDetected.length}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {issuesDetected.map((issue, i) => (
                    <Badge 
                      key={i} 
                      variant="outline"
                      className="bg-orange-500/5 text-orange-600 border-orange-500/20"
                    >
                      {String(issue)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Market & Price */}
          {(priceMin > 0 || priceMax > 0) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CircleDollarSign className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Estimation du marché</span>
                </div>
                <div className="space-y-3">
                  {market !== '-' && (
                    <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-xl">
                      <span className="text-muted-foreground">Marché de référence</span>
                      <span className="font-medium">{market}</span>
                    </div>
                  )}
                  <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/20">
                    <div className="text-sm text-muted-foreground mb-1">Fourchette de prix estimée</div>
                    <p className="text-2xl font-bold text-green-600">
                      {priceMin.toLocaleString()} - {priceMax.toLocaleString()} <span className="text-sm font-normal">XAF/kg</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback */}
          {feedback && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Évaluation générale</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{feedback}</p>
              </CardContent>
            </Card>
          )}

          {/* Improvement Tips */}
          {improvementTips.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Conseils d'amélioration</span>
                </div>
                <div className="space-y-2">
                  {improvementTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm">{String(tip)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Storage Tips */}
          {storageTips.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Conseils de stockage</span>
                </div>
                <div className="space-y-2">
                  {storageTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-blue-500/5 rounded-lg border-l-2 border-blue-500">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{String(tip)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location & Context */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="font-semibold">Contexte géographique</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(latitude !== null && longitude !== null) && (
                  <div className="col-span-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs font-medium">Coordonnées GPS</span>
                    </div>
                    <p className="font-mono text-sm font-medium">
                      {latitude.toFixed(6)}°, {longitude.toFixed(6)}°
                    </p>
                  </div>
                )}

                {region !== '-' && (
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs">Région</span>
                    </div>
                    <p className="font-medium">{region}</p>
                  </div>
                )}
                
                {nearestCity && (
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs">Ville proche</span>
                    </div>
                    <p className="font-medium">{nearestCity}</p>
                  </div>
                )}

                {altitude !== null && (
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-xs">Altitude</span>
                    </div>
                    <p className="font-medium">{altitude} m</p>
                  </div>
                )}

                {climateZone && (
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Sun className="w-4 h-4" />
                      <span className="text-xs">Zone climatique</span>
                    </div>
                    <p className="font-medium">{climateZone}</p>
                  </div>
                )}

                {season && (
                  <div className="p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Saison</span>
                    </div>
                    <p className="font-medium capitalize">{season}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Analysis Time */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <span className="font-semibold">Détails de l'analyse</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Date</span>
                  </div>
                  <p className="font-medium">{format(analysisDate, 'dd MMMM yyyy', { locale: fr })}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-xl">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Heure</span>
                  </div>
                  <p className="font-medium">{format(analysisDate, 'HH:mm', { locale: fr })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer ID */}
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              ID de l'analyse: <code className="bg-muted px-2 py-1 rounded">{activity.id.slice(0, 8)}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const HistoryPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRecord | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchActivities = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setActivities(data as ActivityRecord[]);
      }
      setLoading(false);
    };

    fetchActivities();
  }, [user]);

  const diagnostics = activities.filter(a => a.activity_type === 'diagnosis');
  const harvests = activities.filter(a => a.activity_type === 'harvest_analysis');

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd MMM yyyy à HH:mm', { locale: fr });
  };

  const getMetadataValue = (metadata: Record<string, unknown> | null, key: string): string => {
    if (!metadata) return '-';
    const value = metadata[key];
    return typeof value === 'string' ? value : '-';
  };

  const getSeverityBadge = (metadata: Record<string, unknown> | null) => {
    const severity = String(metadata?.severity || '').toLowerCase();
    const colorMap: Record<string, string> = {
      low: 'bg-green-500/10 text-green-600',
      medium: 'bg-yellow-500/10 text-yellow-600',
      high: 'bg-orange-500/10 text-orange-600',
      critical: 'bg-red-500/10 text-red-600',
    };
    return colorMap[severity] || '';
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t('history.title') || 'Historique'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('history.subtitle') || 'Consultez vos diagnostics et analyses passés'}
        </p>
      </div>

      <Tabs defaultValue="diagnostics" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Diagnostics ({diagnostics.length})
          </TabsTrigger>
          <TabsTrigger value="harvests" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Récoltes ({harvests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics" className="space-y-3">
          {diagnostics.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun diagnostic enregistré</p>
              </CardContent>
            </Card>
          ) : (
            diagnostics.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98]"
                onClick={() => setSelectedActivity(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.created_at)}
                        {item.metadata?.severity && (
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getSeverityBadge(item.metadata))}>
                            {String(item.metadata.severity)}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium text-foreground">
                        {getMetadataValue(item.metadata, 'crop') || 'Culture non spécifiée'}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {getMetadataValue(item.metadata, 'disease_name') || getMetadataValue(item.metadata, 'disease') || 'Diagnostic effectué'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="harvests" className="space-y-3">
          {harvests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune analyse de récolte enregistrée</p>
              </CardContent>
            </Card>
          ) : (
            harvests.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98]"
                onClick={() => setSelectedActivity(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.created_at)}
                        {item.metadata?.grade && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Grade {String(item.metadata.grade)}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium text-foreground">
                        {getMetadataValue(item.metadata, 'crop') || 'Analyse de récolte'}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {item.metadata?.quality_score 
                          ? `Score: ${item.metadata.quality_score}/100` 
                          : 'Qualité analysée'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Modals */}
      {selectedActivity?.activity_type === 'diagnosis' && (
        <DiagnosisDetailModal 
          activity={selectedActivity} 
          onClose={() => setSelectedActivity(null)} 
        />
      )}
      {selectedActivity?.activity_type === 'harvest_analysis' && (
        <HarvestDetailModal 
          activity={selectedActivity} 
          onClose={() => setSelectedActivity(null)} 
        />
      )}
    </PageContainer>
  );
};

export default HistoryPage;
