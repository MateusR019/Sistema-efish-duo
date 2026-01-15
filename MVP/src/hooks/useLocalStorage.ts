import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return initialValue;
    }

    try {
      return JSON.parse(stored) as T;
    } catch (error) {
      console.warn(`Não foi possível ler ${key} do localStorage`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  const reset = () => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(key);
    setValue(initialValue);
  };

  return { value, setValue, reset } as const;
}
