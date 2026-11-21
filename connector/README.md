# WaitWalk MCP adapter

This optional read-only [Model Context Protocol](https://modelcontextprotocol.io/) server lives beside the WaitWalk web app and planner. It does not require an AI API key. It can prepare a link with just a time budget, or calculate two time-budget choices (30 or 60 minutes) and return one PNG treasure map as a standard image content block along with route data. The host AI decides whether to display the actual image inline; no consumer app integration is enabled by installing this folder alone.

## Install and try locally

Requires Node 22+ and npm. From this directory:

```sh
npm ci --ignore-scripts
npm test
```

The tests exercise the adapter through the official MCP client and offline fixture. For a local MCP client, configure a stdio server with a command of `node`, the **absolute** path to `connector/mcp.mjs` in its arguments, and the optional environment setting `WAITWALK_SITE_URL` set to the root of your hosted WaitWalk static UI. Use a clean HTTPS URL. A localhost HTTP URL is accepted for local development only. The adapter writes MCP messages to stdout. Run the test rather than launching the server as a terminal CLI.

Tools:

- `plan_walk({"mode":"demo","minutes":45,"interest":"photo"})` uses a fictional neighborhood. It shows the shape of the result without contacting a network or reading your location.
- `plan_walk({"mode":"live","lat":47.6,"lon":-122.3,"minutes":45,"acknowledge_location_sharing":true})` sends the user-confirmed coordinates to the planner's configured Overpass service. The flag is required; call the live tool only after the user explicitly agrees to share the coordinates with the provider. If no routes fit or coverage is missing, don't manufacture a route or trust an unverified shortcut.
- `prepare_walk_link({"minutes":45,"interest":"coffee"})` puts no location in the link. For user-confirmed location links, set both `lat` and `lon` and `acknowledge_link_location:true` only after specific approval. Never put private addresses or family names in the optional label. A location in a URL can appear in browser history, hosting logs, or messages to which it is pasted. A link itself does **not** request live map data.

A live map is a snapshot of map data and a time estimate. It does not guarantee business hours, route access, accessibility, or arrival by a deadline. The PNG is stylized; route data comes from the planner, not an image generator.

The optional `minutes` argument highlights the highest of the two caps no greater than the available time; it does not hide the other option and highlights neither when there are fewer than 30 minutes. No-fit caps are explicitly shown. The adapter bounds planner and renderer time independently (24 s and 3 s respectively, ≤28 s target at the adapter, excluding client and network overhead). Live data latency depends on the Overpass service, so 10 s is a target, not a promise. The browser and fixture demo provide fallbacks.

## Optional Streamable HTTP development endpoint

```sh
export WAITWALK_MCP_TOKEN="$(openssl rand -hex 32)"
export WAITWALK_SITE_URL="https://your-approved-waitwalk-host.example/"
node mcp.mjs --http
```

The default URL is `http://127.0.0.1:8765/mcp` (`WAITWALK_MCP_PORT` overrides the port). It binds to loopback, uses JSON replies, and refuses requests from browser origins, requests with a non-loopback Host, and requests without the correct bearer token. Keep the token in your approved credential storage; do not paste it into a chat or save it in version control.

Remote MCP clients cannot access your localhost directly. If using a compatible private tunnel or managed proxy, terminate HTTPS and authenticate on that trusted service, forward the exact loopback Host and the bearer header for the local hop, and do not log tool payloads. The adapter intentionally does not implement OAuth discovery or support a public deployment. Do not expose it publicly or bypass protected network boundaries. SDK tests prove the protocol behavior over stdio and authenticated loopback; they do not establish setup or inline rendering inside any signed-in AI product.

The live inline PNG shows the routed line(s) and points; open the browser map for surrounding street and area context. The fixture PNG includes an illustrative basemap. Neither is a substitute for turn-by-turn instructions.
