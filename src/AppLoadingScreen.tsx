export function AppLoadingScreen({ message }: { message: string }) {
  return (
    <main className="app-loading-screen">
      <span className="button-spinner" aria-hidden="true" />
      <span>{message}</span>
    </main>
  );
}
