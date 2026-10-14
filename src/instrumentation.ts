export async function register() {
  // Koşul derleme sırasında sabitlenir; edge derlemesine Node modülleri girmez
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { runDataMigrations } = await import("./lib/data-migrations");
      await runDataMigrations();
    } catch (e) {
      console.error("Veri güncellemeleri çalıştırılamadı", e);
    }
    if (process.env.ENABLE_SCHEDULER === "true") {
      const { startScheduler } = await import("./lib/scheduler");
      startScheduler();
    }
  }
}
