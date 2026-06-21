import { createServer } from "node:http";
import { loadConfig } from "@helpdock/config";
import { createWidgetPlaceholder } from "./widget.ts";

loadConfig();

const port = Number(process.env.PORT ?? 3002);
createServer((_request, response) => {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify(createWidgetPlaceholder()));
}).listen(port, () => {
  console.log(`widget shell listening on ${port}`);
});
