import { runCommercialIntelligenceCollection } from "../lib/giie-commercial-collector";

runCommercialIntelligenceCollection()
  .then((result) => {
    process.stdout.write(JSON.stringify({ ok: true, ...result }) + "\n");
  })
  .catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : "Commercial intelligence collection failed.";
    process.stderr.write(JSON.stringify({ ok: false, error: message }) + "\n");
    process.exitCode = 1;
  });
