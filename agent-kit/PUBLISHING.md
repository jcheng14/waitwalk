# Publish and update your own copy

The ZIP is a source release, not an installed marketplace app or an existing public GitHub repository.

## Publish the code

After unzipping, create an empty public Git repository you control. From the project folder run these commands only if you want to publish the contents:

```sh
git init -b main
git add .
git commit -m "Initial release of WaitWalk"
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPO.git
git push -u origin main
```

Verify that the checkout contains only the application, sample data, tests, and docs. Keep API keys, real user locations and routes out of Git. The instructions-only `waitwalk-skill.zip` may be uploaded separately to a GitHub release so that users can import it without taking the complete program.

A static host can serve the `site/` directory. Use HTTPS for browser geolocation. The static site does not automatically publish or expose the local MCP server. If you later choose to distribute a real hosted connector, add per-user authentication, rate limiting and privacy documentation before sharing the endpoint.

## Keep it up to date

- Users who cloned the repository can update using `git pull --ff-only` on a clean checkout and then rebuild or redeploy their own copy if needed.
- Users who downloaded a ZIP can download the new version. A skill imported into a chat app is generally a snapshot: replace or re-upload it under that platform's supported workflow.
- Contributors can fork, work on a branch, run the tests, and submit a pull request. Do not commit customer requests, personal locations, provider credentials, or copied/cached map datasets.
