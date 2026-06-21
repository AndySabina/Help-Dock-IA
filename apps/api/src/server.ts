import { createServer } from "node:http";
import { loadConfig } from "@helpdock/config";
import { createHealthPayload } from "./health.ts";

loadConfig();

const port = Number(process.env.PORT ?? 3001);
const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(createHealthPayload()));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, () => {
  console.log(`api shell listening on ${port}`);
});
