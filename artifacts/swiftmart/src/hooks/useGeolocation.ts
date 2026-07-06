import { useState, useEffect, useRef, useCallback } from "react";

export type GeoPermission = "granted" | "denied" | "prompt" | "unsupported";

export interface GeoPosition {
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: number;
}

interface UseGeolocationOptions {
  watch?: boolean;
  highAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  onPosition?: (pos: GeoPosition) => void;
}

interface UseGeolocationReturn {
  position: GeoPosition | null;
  permission: GeoPermission;
  error: string | null;
  requesting: boolean;
  requestPermission: () => void;
  stop: () => void;
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    watch = false,
    highAccuracy = true,
    timeout = 10000,
    maximumAge = 5000,
    onPosition,
  } = options;

  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [permission, setPermission] = useState<GeoPermission>("prompt");
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setRequesting(false);
    setError(null);
    setPermission("granted");
    const gp: GeoPosition = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    };
    setPosition(gp);
    onPositionRef.current?.(gp);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setRequesting(false);
    if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
      setPermission("denied");
      setError("Location access denied. Please allow location in browser settings.");
    } else if (err.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
      setError("Location unavailable. Check your GPS signal.");
    } else {
      setError("Location request timed out. Please try again.");
    }
  }, []);

  const geoOptions: PositionOptions = {
    enableHighAccuracy: highAccuracy,
    timeout,
    maximumAge,
  };

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setPermission("unsupported");
      return;
    }
    setRequesting(true);
    setError(null);

    stopWatching();

    if (watch) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        geoOptions,
      );
    } else {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);
    }
  }, [watch, handleSuccess, handleError, stopWatching]);

  // Check initial permission state via Permissions API (non-blocking)
  useEffect(() => {
    if (!navigator.geolocation) {
      setPermission("unsupported");
      return;
    }
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      setPermission(result.state as GeoPermission);
      result.addEventListener("change", () => {
        setPermission(result.state as GeoPermission);
        if (result.state === "denied") {
          setError("Location access denied. Please allow location in browser settings.");
          stopWatching();
        }
        if (result.state === "granted" && watch) {
          requestPermission();
        }
      });
    });
  }, []);

  useEffect(() => () => stopWatching(), [stopWatching]);

  return {
    position,
    permission,
    error,
    requesting,
    requestPermission,
    stop: stopWatching,
  };
}
