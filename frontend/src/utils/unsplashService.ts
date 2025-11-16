// Service pour récupérer des images depuis Unsplash
const UNSPLASH_ACCESS_KEY = 'eZJW7LjgPg5mCLFHbxJx2-8Bh2-xKGFBEjF3kzqJ0ZY'; // Clé publique Unsplash

export interface UnsplashImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  description: string;
  photographer: string;
  photographerUrl: string;
}

export const searchCityImages = async (cityName: string, count: number = 3): Promise<UnsplashImage[]> => {
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(cityName + ' city travel landmark')}&per_page=${count}&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`
    );

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des images');
    }

    const data = await response.json();
    
    return data.results.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.small,
      description: photo.description || photo.alt_description || `Photo de ${cityName}`,
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html
    }));
  } catch (error) {
    console.error('Erreur Unsplash:', error);
    return [];
  }
};

export const getRandomCityImage = async (cityName: string): Promise<UnsplashImage | null> => {
  const images = await searchCityImages(cityName, 1);
  return images.length > 0 ? images[0] : null;
};