import { createContext, useContext, type ReactNode } from "react";
import { useAppController } from "./hooks/useAppController";

type AppControllerModel = ReturnType<typeof useAppController>;

const AppControllerContext = createContext<AppControllerModel | null>(null);

export function AppControllerProvider({ children }: { children: ReactNode }) {
  const model = useAppController();
  return <AppControllerContext.Provider value={model}>{children}</AppControllerContext.Provider>;
}

export function useAppControllerContext() {
  const model = useContext(AppControllerContext);
  if (!model) {
    throw new Error("useAppControllerContext must be used within AppControllerProvider");
  }
  return model;
}
