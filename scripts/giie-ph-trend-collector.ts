import { runPhilippinesTrendCollection } from "../lib/giie-ph-trends";

runPhilippinesTrendCollection()
  .then((result) => {
    process.stdout.write(JSON.stringify({ ok: true, ...result }) + "\n");
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Philippines trend collection failed.";
    process.stderr.write(JSON.stringify({ ok: false, error: message }) + "\n");
    process.exitCode = 1;
  });
