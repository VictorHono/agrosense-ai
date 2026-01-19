// User Types
export interface User {
  id: string;
  phone: string;
  name?: string;
  region: Region;
  language: Language;
  farmerType: FarmerType;
  createdAt: Date;
  lastActive: Date;
}

export type Language = 'fr' | 'en';
export type FarmerType = 'vivrier' | 'commercial' | 'cooperative';

export type Region = 
  | 'adamaoua'
  | 'centre'
  | 'est'
  | 'extreme-nord'
  | 'littoral'
  | 'nord'
  | 'nord-ouest'
  | 'ouest'
  | 'sud'
  | 'sud-ouest';

// Disease Analysis Types
export interface DiseaseAnalysis {
  id: string;
  userId: string;
  imageUrl: string;
  crop: Crop;
  result: DiseaseResult;
  createdAt: Date;
}

export interface DiseaseResult {
  disease: string;
  localName?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  causes: string[];
  symptoms: string[];
  treatments: Treatment[];
  prevention: string[];
}

export interface Treatment {
  type: 'biological' | 'chemical';
  name: string;
  localName?: string;
  dosage: string;
  frequency: string;
  precautions: string[];
  availableLocally: boolean;
}

// Harvest Quality Types
export interface HarvestAnalysis {
  id: string;
  userId: string;
  imageUrl: string;
  crop: Crop;
  result: HarvestResult;
  createdAt: Date;
}

export interface HarvestResult {
  grade: 'A' | 'B' | 'C';
  quality: QualityMetrics;
  recommendedUse: string[];
  estimatedPrice: PriceEstimate;
  feedback: string;
}

export interface QualityMetrics {
  color: number;
  size: number;
  defects: number;
  uniformity: number;
  maturity: number;
}

export interface PriceEstimate {
  min: number;
  max: number;
  currency: 'XAF';
  unit: string;
  market: string;
}

// Crop Types
export type Crop = 
  | 'mais'
  | 'cacao'
  | 'cafe'
  | 'manioc'
  | 'banane-plantain'
  | 'tomate'
  | 'piment'
  | 'arachide'
  | 'haricot'
  | 'igname'
  | 'macabo'
  | 'palmier'
  | 'ananas'
  | 'avocat'
  | 'mangue'
  | 'papaye'
  | 'orange'
  | 'other';

export const CROP_LABELS: Record<Crop, { fr: string; en: string }> = {
  'mais': { fr: 'Maïs', en: 'Corn' },
  'cacao': { fr: 'Cacao', en: 'Cocoa' },
  'cafe': { fr: 'Café', en: 'Coffee' },
  'manioc': { fr: 'Manioc', en: 'Cassava' },
  'banane-plantain': { fr: 'Banane Plantain', en: 'Plantain' },
  'tomate': { fr: 'Tomate', en: 'Tomato' },
  'piment': { fr: 'Piment', en: 'Pepper' },
  'arachide': { fr: 'Arachide', en: 'Peanut' },
  'haricot': { fr: 'Haricot', en: 'Bean' },
  'igname': { fr: 'Igname', en: 'Yam' },
  'macabo': { fr: 'Macabo', en: 'Cocoyam' },
  'palmier': { fr: 'Palmier à huile', en: 'Oil Palm' },
  'ananas': { fr: 'Ananas', en: 'Pineapple' },
  'avocat': { fr: 'Avocat', en: 'Avocado' },
  'mangue': { fr: 'Mangue', en: 'Mango' },
  'papaye': { fr: 'Papaye', en: 'Papaya' },
  'orange': { fr: 'Orange', en: 'Orange' },
  'other': { fr: 'Autre', en: 'Other' },
};

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: Date;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'alert' | 'info' | 'reminder';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

// Admin Types
export interface AdminStats {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  analyses: {
    diseases: number;
    harvests: number;
  };
  topCrops: { crop: Crop; count: number }[];
  topDiseases: { disease: string; count: number }[];
  regionActivity: { region: Region; users: number }[];
}
