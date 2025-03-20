import { EstimatorServer } from "./server";
import { logWithTime } from "./util";

const server = new EstimatorServer();
server.start();

process.on("SIGINT", function () {
  logWithTime("Stopping application...");
  process.exit();
});
