import { DependencyList, useCallback, useEffect, useState } from "react";
import api from "../api/api";

type UseApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type UseApiResult<T> = UseApiState<T> & {
  refresh: () => Promise<void>;
};

const extractErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Erreur de chargement";
};

export function useApi<T>(endpoint: string, deps: DependencyList = []): UseApiResult<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await api.get<T>(endpoint);
      setState({ data: response.data, loading: false, error: null });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: extractErrorMessage(error) }));
    }
  }, [endpoint]);

  useEffect(() => {
    void refresh();
  }, [refresh, ...deps]);

  return { ...state, refresh };
}
