const GEOLOCATION_NOT_SUPPORTED = 'Geolocation is not supported by this browser.';
const GEOLOCATION_DENIED = 'Location permission denied. Please allow location access.';
const GEOLOCATION_UNAVAILABLE = 'Location is unavailable right now.';
const GEOLOCATION_TIMEOUT = 'Location request timed out. Please try again.';

const mapGeolocationError = (error) => {
  if (!error || typeof error.code !== 'number') {
    return 'Unable to fetch current location.';
  }

  if (error.code === 1) return GEOLOCATION_DENIED;
  if (error.code === 2) return GEOLOCATION_UNAVAILABLE;
  if (error.code === 3) return GEOLOCATION_TIMEOUT;
  return 'Unable to fetch current location.';
};

const requestBrowserLocation = () => {
  if (!navigator.geolocation) {
    return Promise.reject(new Error(GEOLOCATION_NOT_SUPPORTED));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lng: Number(position.coords.longitude).toFixed(6),
          lat: Number(position.coords.latitude).toFixed(6),
        });
      },
      (error) => reject(new Error(mapGeolocationError(error))),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
};

const buildPlaceLabel = (result) => {
  const address = result?.address || {};
  const parts = [
    address.suburb || address.neighbourhood || address.village || address.town || address.city_district,
    address.city || address.town || address.village,
    address.state,
    address.country,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(', ');
  }

  return result?.display_name || '';
};

const reverseGeocodeCoordinates = async (lng, lat) => {
  const parsedLng = Number(lng);
  const parsedLat = Number(lat);

  if (!Number.isFinite(parsedLng) || !Number.isFinite(parsedLat)) {
    throw new Error('Invalid coordinates for place lookup.');
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(parsedLat)}&lon=${encodeURIComponent(parsedLng)}&zoom=16&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Unable to resolve place name from coordinates.');
  }

  const data = await response.json();
  return buildPlaceLabel(data);
};

export { requestBrowserLocation, reverseGeocodeCoordinates };
