import { AppControllerProvider } from "./AppControllerContext";
import { AppView } from "./AppView";
import { useAppController } from "./hooks/useAppController";
import "./styles.css";

export default function App() {
  return (
    <AppControllerProvider>
      <AppView page="lineup" />
    </AppControllerProvider>
  );
}

// Legacy entry kept for tooling; workspace routes mount AppView directly.
export { AppControllerProvider, AppView, useAppController };
