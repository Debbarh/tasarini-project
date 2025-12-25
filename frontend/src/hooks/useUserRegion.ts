import { useEffect, useState } from "react";

export type Region = "US" | "UK" | "EU" | "FR" | "CA" | "AU" | "DEFAULT";

interface GeoLocation {
  country_code?: string;
  country?: string;
  country_name?: string;
  continent_code?: string;
}

/**
 * Hook to detect user's region based on their IP address
 * Uses geojs.io free API (supports CORS, no API key required)
 */
export const useUserRegion = () => {
  const [region, setRegion] = useState<Region>("DEFAULT");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectRegion = async () => {
      try {
        // Check if region is already cached in localStorage
        const cachedRegion = localStorage.getItem("user_region");
        if (cachedRegion) {
          setRegion(cachedRegion as Region);
          setLoading(false);
          return;
        }

        // Fetch geolocation data from geojs.io (supports CORS)
        const response = await fetch("https://get.geojs.io/v1/ip/country.json");
        if (!response.ok) {
          throw new Error("Failed to fetch geolocation");
        }

        const data: GeoLocation = await response.json();
        const countryCode = data.country_code || data.country;

        // Map country code to region
        let detectedRegion: Region = "DEFAULT";

        // European countries
        const europeanCountries = [
          "FR", "DE", "IT", "ES", "PT", "NL", "BE", "LU", "AT", "CH",
          "PL", "CZ", "SK", "HU", "RO", "BG", "HR", "SI", "GR", "CY",
          "DK", "SE", "NO", "FI", "IE", "IS", "EE", "LV", "LT", "MT"
        ];

        if (countryCode === "US") {
          detectedRegion = "US";
        } else if (countryCode === "GB") {
          detectedRegion = "UK";
        } else if (countryCode === "FR") {
          detectedRegion = "FR";
        } else if (countryCode === "CA") {
          detectedRegion = "CA";
        } else if (countryCode === "AU") {
          detectedRegion = "AU";
        } else if (europeanCountries.includes(countryCode || "")) {
          detectedRegion = "EU";
        }

        // Cache the region in localStorage (expires after 24 hours)
        localStorage.setItem("user_region", detectedRegion);
        localStorage.setItem("user_region_timestamp", Date.now().toString());

        setRegion(detectedRegion);
      } catch (err) {
        console.error("Error detecting region:", err);
        setError("Failed to detect region");
        setRegion("DEFAULT"); // Fallback to default
      } finally {
        setLoading(false);
      }
    };

    // Check if cached region is still valid (24 hours)
    const cachedTimestamp = localStorage.getItem("user_region_timestamp");
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (cachedTimestamp && now - parseInt(cachedTimestamp) < twentyFourHours) {
      const cachedRegion = localStorage.getItem("user_region");
      if (cachedRegion) {
        setRegion(cachedRegion as Region);
        setLoading(false);
        return;
      }
    }

    detectRegion();
  }, []);

  return { region, loading, error };
};
