# WaitWalk for AI assistants

WaitWalk has three independent parts: a map app, the instructions in `waitwalk/SKILL.md`, and an optional connector. Downloading a ZIP alone does not install it or turn it on in every chat. The map is usable without an AI account. The standalone skill can guide a conversation, but does not give a model a routing engine or a map provider.

| Client | Start here |
| --- | --- |
| Gemini Apps | Where Skills is available, open Customize → Skills → Create → Upload and pick `SKILL.md` or the **skill-only** ZIP. Then invoke the skill in chat or let Gemini match it. This is instructions only: use the map app to compute and visualize routes unless the client has a separately supported connector. [Google's instructions](https://support.google.com/gemini/answer/17094296) |
| ChatGPT | In eligible workspaces with Skills, use Plugins → Skills → Create → Upload. Otherwise keep the instructions in a dedicated Project/custom assistant if supported, or paste them into a conversation. For native tool calls, connect a self-hosted HTTPS MCP endpoint where uploads/custom MCP are available; a local stdio process cannot be reached directly by ChatGPT. [Skills](https://help.openai.com/en/articles/20001066-skills-in-chatgpt) · [Custom MCP](https://developers.openai.com/api/docs/guides/custom-mcp-server) |
| Codex / Gemini CLI | Use the skill folder and, optionally, register the connector as a local MCP server following `connector/README.md`. Codex loads project skills placed in `.agents/skills/waitwalk/`. [Codex skills](https://developers.openai.com/plugins/concepts/skills) · [Gemini CLI MCP](https://geminicli.com/docs/tools/mcp-server/) |
| Meta Muse | Paste the instructions, or request a Custom Connector for your trusted self-hosted endpoint if available on your account. We did not verify arbitrary skill-file installation in Muse. [Meta’s connector guidance](https://www.meta.com/en-gb/help/superintelligence/1687253048996149/) |

If you have a deployed map URL, add that trusted URL to your platform’s copy of the skill. Otherwise open the local app separately. Do not publish URLs that contain someone’s actual location or family routine. Keep a deployed connector private or access-controlled unless you are deliberately operating a public service.

## Updates and contributions

- Keep the source in a Git repo you control. For a first publication, create an empty repo, then point your local `origin` to it and push only this project. See the main README for commands.
- On a clean checkout use `git pull --ff-only`, restart/redeploy the app or MCP process you use, and re-upload the new `SKILL.md` if your AI app imported a snapshot. A Git push cannot silently update every user's uploaded copy.
- To propose changes, fork, use a branch, run the offline tests, push to the fork and open a pull request. Do not include private routes, exact GPS histories, credentials, or bulk map data in a commit.

These are platform setup paths, not a claim of marketplace publication or end-to-end verification inside each consumer app.
