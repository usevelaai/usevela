"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { type AppConfig, getConfig } from "./api";

interface ConfigContextValue {
  config: AppConfig | null;
  loading: boolean;
  isSelfHosted: boolean;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: null,
  loading: true,
  isSelfHosted: true, // Default to true
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ConfigContext.Provider
      value={{
        config,
        loading,
        isSelfHosted: config?.selfHosted ?? true,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
