import type { Language } from '@/i18n';

type District = {
  pt: string;
  en: string;
};

/**
 * IPMA `idDistrito` values. 1-18 are mainland districts, 31/32 Madeira and
 * Porto Santo, 41-49 the Azores islands.
 */
const DISTRICTS: Record<number, District> = {
  1: { pt: 'Aveiro', en: 'Aveiro' },
  2: { pt: 'Beja', en: 'Beja' },
  3: { pt: 'Braga', en: 'Braga' },
  4: { pt: 'Bragança', en: 'Bragança' },
  5: { pt: 'Castelo Branco', en: 'Castelo Branco' },
  6: { pt: 'Coimbra', en: 'Coimbra' },
  7: { pt: 'Évora', en: 'Évora' },
  8: { pt: 'Faro', en: 'Faro' },
  9: { pt: 'Guarda', en: 'Guarda' },
  10: { pt: 'Leiria', en: 'Leiria' },
  11: { pt: 'Lisboa', en: 'Lisbon' },
  12: { pt: 'Portalegre', en: 'Portalegre' },
  13: { pt: 'Porto', en: 'Porto' },
  14: { pt: 'Santarém', en: 'Santarém' },
  15: { pt: 'Setúbal', en: 'Setúbal' },
  16: { pt: 'Viana do Castelo', en: 'Viana do Castelo' },
  17: { pt: 'Vila Real', en: 'Vila Real' },
  18: { pt: 'Viseu', en: 'Viseu' },
  31: { pt: 'Madeira', en: 'Madeira' },
  32: { pt: 'Porto Santo', en: 'Porto Santo' },
  41: { pt: 'Ilha de Santa Maria', en: 'Santa Maria Island' },
  42: { pt: 'Ilha de São Miguel', en: 'São Miguel Island' },
  43: { pt: 'Ilha Terceira', en: 'Terceira Island' },
  44: { pt: 'Ilha Graciosa', en: 'Graciosa Island' },
  45: { pt: 'Ilha de São Jorge', en: 'São Jorge Island' },
  46: { pt: 'Ilha do Pico', en: 'Pico Island' },
  47: { pt: 'Ilha do Faial', en: 'Faial Island' },
  48: { pt: 'Ilha das Flores', en: 'Flores Island' },
  49: { pt: 'Ilha do Corvo', en: 'Corvo Island' },
};

export function districtName(idDistrito: number, language: Language): string {
  const district = DISTRICTS[idDistrito];

  if (!district) {
    return '—';
  }

  return language === 'pt' ? district.pt : district.en;
}
