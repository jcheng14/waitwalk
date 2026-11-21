# WaitWalk

**Turn the time between drop-off and pickup into a little walk.** Choose where you are and get one illustrated treasure map with 30- and 60-minute walking options. Your requested time is highlighted. Each plan comes back to its starting point, with a few interesting things to see on the way.

## Try it locally

1. Download and unzip this repository, or clone your copy.
2. From the project directory, run:

   ```sh
   python3 -m http.server 8080 --bind 127.0.0.1 --directory site
   ```

3. Open <http://localhost:8080>. The illustrated sample works without a network. Choose **Choose a place** to search, type coordinates, or use your current location. **Save image** downloads the displayed map as a PNG, or SVG if PNG export is unavailable.

The web app needs no account and no API key. Browsers require HTTPS (or localhost) for location permission. A live query does require working map-provider connectivity. The photo and other icons describe the type of stop; they are not photographs of the venue.

### CLI

Use Node.js 22+ from the repository root:

```sh
node plan-walk.mjs --demo --choices --svg --minutes 30 > waitwalk-demo.svg
node plan-walk.mjs --demo --minutes 90 --geojson
node plan-walk.mjs --live --lat=47.6205 --lon=-122.3493 --choices --minutes 30
node --test test/*.test.mjs
```

`--choices` produces one map's 30/60 comparison. Without `--choices` the CLI plans to a single 15–90 minute budget. Use `--svg` for a shareable image or `--geojson` for route data. The Seattle Center example is a public landmark, not a saved user location.

## Ask in your own AI chat

See [the agent setup instructions](agent-kit/SETUP.md) and the [MCP adapter](connector/README.md). The map engine is independent of any AI account. Each assistant has its own install or connector requirements; downloading this source does not change any assistant's chat behavior until configured. The web app remains available without a connector.

## Update or contribute

When a copy is hosted on Git, you can use your own fork/clone:

```sh
git pull --ff-only
git switch -c improve-waitwalk
# Edit and test, then commit your changes.
git push -u origin improve-waitwalk
```

Open a pull request from your branch to the upstream repository. A downloaded ZIP can be replaced by downloading a newer release; for incremental updates and contributions use Git. These commands do not publish a project automatically.

## Real map data, estimates, and privacy

- **Search:** the explicitly entered place text goes to [Photon](https://github.com/komoot/photon). There is no autocomplete request on every keystroke. Coordinates may be entered without searching.
- **Routing:** the requested area goes to [Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API); no account, no location history on disk, and no background requests. Live map data is © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). Browser deployments can point the `endpoints` in `site/data.mjs` at their own CORS-enabled instances; node deployments can set `WAITWALK_OVERPASS_URL`. The routing provider has an 8.5-second client deadline and the optional address search a 5-second deadline; a timeout never becomes an invented route. The last three identical live graph requests are reused in memory. The engine computes paths and draws the illustrated SVG in-process without sending a second image-generation request. These provider timeouts are not an end-to-end latency guarantee. Public demo services are rate-limited and not production SLAs. Use your own or contracted instances for recurring/high-volume deployments.
- **Timing:** estimates use 4.2 km/h plus a five-minute return buffer and one planned stop. A coffee stop allows eight minutes for ordering/waiting; numbered sights are listed in walking order; glance at pass-by sights without budgeting a separate visit. Check hours, wait, sidewalks, crossings and accessibility before following a route.
- **Loop logic:** a loop needs a distinct mapped way back, with no repeated segment or interior node. Where not found within budget, the engine can offer a labeled out-and-back, or no route. Dotted connectors to the mapped street are approximate access links. Some labels/paths may be missing from the input data; the app does not invent a live route or substitute the sample.
- **Sharing:** an exported map, GeoJSON or link with coordinates can reveal the starting point; share only where intended. The sample location, names and geometry are fictional. The app is a discovery aid, not turn-by-turn or accessibility routing.

[MIT License](LICENSE) covers the source code. OpenStreetMap data is separately licensed.

For initial publication and updates, see [Publishing and updates](agent-kit/PUBLISHING.md).
