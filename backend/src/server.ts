import app from "./app.js";
import { env } from "./config/env.js";
import { startJobs } from "./jobs/scheduler.js";
import { loadPlantModel } from "./lib/plant-model.js";
import { vapidKeys } from "./lib/push.js";

app.listen(env.port, () => {
  console.log(
    `AgriGuard API running on http://localhost:${env.port}`
  );
  vapidKeys();
  loadPlantModel()
    .then(() => console.log("Crop disease model ready"))
    .catch((error) => console.error("Crop disease model failed to load", error));
  startJobs();
});
