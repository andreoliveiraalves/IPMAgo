export type Language = 'pt' | 'en';

const pt = {
  appName: 'IPMAgo',
  tabForecast: 'Previsão',
  tabLocations: 'Locais',

  favorites: 'Favoritos',
  myLocation: 'A minha localização',
  enableLocation: 'Usar a minha localização',
  locating: 'A obter localização…',
  locationDenied: 'Sem acesso à localização',
  locationDeniedHint: 'Permita o acesso nas definições para ver a previsão do local mais próximo.',
  locationError: 'Não foi possível obter a sua localização.',
  distanceAway: 'a {km} km',

  addFavorite: 'Adicionar aos favoritos',
  removeFavorite: 'Remover dos favoritos',
  removeTitle: 'Remover localização',
  removeMessage: 'Remover {name} dos favoritos?',
  cancel: 'Cancelar',
  remove: 'Remover',

  searchPlaceholder: 'Procurar localidade',
  locationsHint: 'Toque para ver os próximos 5 dias.',
  noResults: 'Nenhuma localidade encontrada',

  noFavorites: 'Ainda não tem favoritos',
  noFavoritesHint: 'Escolha as localidades que quer acompanhar.',
  browseLocations: 'Ver localidades',

  loading: 'A carregar…',
  retry: 'Tentar novamente',
  loadError: 'Não foi possível carregar os dados.',
  noData: 'Sem dados disponíveis',

  today: 'Hoje',
  tomorrow: 'Amanhã',
  nextDays: 'Próximos 5 dias',
  min: 'Mín.',
  max: 'Máx.',
  rain: 'Chuva',
  wind: 'Vento',
  windFrom: '{direction}',

  updatedNow: 'Atualizado agora',
  updatedMinutes: 'Atualizado há {count} min',
  updatedHours: 'Atualizado há {count} h',
  offlineCache: 'Sem ligação — a mostrar os últimos dados guardados.',

  language: 'Idioma',
} as const;

export type TranslationKey = keyof typeof pt;

const en: Record<TranslationKey, string> = {
  appName: 'IPMAgo',
  tabForecast: 'Forecast',
  tabLocations: 'Locations',

  favorites: 'Favorites',
  myLocation: 'My location',
  enableLocation: 'Use my location',
  locating: 'Getting your location…',
  locationDenied: 'Location access denied',
  locationDeniedHint: 'Allow location access in settings to see the nearest forecast.',
  locationError: 'Could not get your location.',
  distanceAway: '{km} km away',

  addFavorite: 'Add to favorites',
  removeFavorite: 'Remove from favorites',
  removeTitle: 'Remove location',
  removeMessage: 'Remove {name} from favorites?',
  cancel: 'Cancel',
  remove: 'Remove',

  searchPlaceholder: 'Search for a location',
  locationsHint: 'Tap to see the next 5 days.',
  noResults: 'No locations found',

  noFavorites: 'No favorites yet',
  noFavoritesHint: 'Pick the places you want to follow.',
  browseLocations: 'Browse locations',

  loading: 'Loading…',
  retry: 'Try again',
  loadError: 'Could not load the data.',
  noData: 'No data available',

  today: 'Today',
  tomorrow: 'Tomorrow',
  nextDays: 'Next 5 days',
  min: 'Min.',
  max: 'Max.',
  rain: 'Rain',
  wind: 'Wind',
  windFrom: '{direction}',

  updatedNow: 'Updated just now',
  updatedMinutes: 'Updated {count} min ago',
  updatedHours: 'Updated {count} h ago',
  offlineCache: 'Offline — showing the last saved data.',

  language: 'Language',
};

export const translations: Record<Language, Record<TranslationKey, string>> = { pt, en };
