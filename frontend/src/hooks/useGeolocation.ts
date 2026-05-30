import { useCallback, useState } from 'react';

export function useGeolocation() {
  const [coords, setCoords] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée par ce navigateur');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const value = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        setCoords(value);
        setLoading(false);
      },
      () => {
        setError('Impossible de capturer la position GPS');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  return { coords, setCoords, capture, loading, error };
}
