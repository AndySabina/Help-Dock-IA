import { createServer } from "node:http";
import { loadConfig } from "@helpdock/config";
import { createAdminShell } from "./shell.ts";

loadConfig();

const port = Number(process.env.PORT ?? 3000);
createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html" });
  response.end(createAdminShell());
}).listen(port, () => {
  console.log(`admin shell listening on ${port}`);
});
