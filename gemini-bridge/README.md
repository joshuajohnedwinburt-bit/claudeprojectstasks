# gemini-bridge: let Claude Code call Gemini on your Google AI Pro plan

Claude (in Claude Code) can ask Gemini for a second opinion or hand it a task. Calls go through Google's own **Antigravity CLI** (`agy`) signed in with your Google account, so they draw on your **Google AI Pro** quota instead of a paid API key.

Why Antigravity and not Gemini CLI: since **June 18, 2026** Gemini CLI no longer serves free, AI Pro or AI Ultra accounts ("Login with Google" was removed); those users were moved to Antigravity CLI. Most "Gemini MCP for Claude Code" servers still wrap Gemini CLI, so with an AI Pro login they no longer work. `agy` has an official headless mode (`agy -p`) that uses your cached Google sign-in.

What you get:
- `ask-gemini`: a small shell command wrapping `agy -p ... --output-format json --mode plan`.
- `/ask-gemini` skill: Claude calls Gemini itself when you say "ask Gemini" or a cross-check would help.
- `gemini` subagent: Claude delegates a whole question or review; the subagent (on Haiku, to keep it cheap) relays to Gemini and spot-checks the answer.

## Setup (Mac, about 5 minutes)

1. **Install the Antigravity CLI** (also `jq`):
   ```bash
   curl -fsSL https://antigravity.google/cli/install.sh | bash
   brew install jq
   ```
   Check the current command on the official page if that fails: https://antigravity.google/docs/install/

2. **Sign in once, interactively**:
   ```bash
   agy
   ```
   Pick **Google OAuth** and sign in with the Google account that has AI Pro. Headless mode reuses this cached login. Type `/quit` (or Ctrl+C) when it's ready.

3. **See which models your plan has**:
   ```bash
   agy models
   ```
   On AI Pro expect Gemini 4 Hydrogen, Neon/Argon and the 3.x Flash models (Gemini 4 Carbon is Ultra-only).

4. **Smoke test**:
   ```bash
   agy -p "Say hi in five words." --output-format json | jq -r .response
   ```

5. **Install the bridge** from a clone of this repo:
   ```bash
   ./gemini-bridge/install.sh
   ask-gemini "Say hi in five words."
   ```

6. **Optional: skip permission prompts** for it. In `~/.claude/settings.json`:
   ```json
   { "permissions": { "allow": ["Bash(ask-gemini:*)"] } }
   ```

7. Restart Claude Code. Try:
   - `ask Gemini whether this migration plan has holes`
   - `use the gemini agent to review my staged changes`
   - `/ask-gemini what's the cleanest way to debounce this hook?`

## Choosing a model

Default is whatever `agy` picks. To pin one, set it in your shell profile or per call:
```bash
export GEMINI_MODEL=gemini-4-hydrogen-high     # slug from `agy models`
GEMINI_MODEL=gemini-3.8-flash-medium ask-gemini "quick check..."
```
`GEMINI_EFFORT` (low…max) and `ASK_GEMINI_MODE=accept-edits` (let Gemini edit files) are also supported.

## Things to know

- **Quota**: AI Pro gives a "high" quota that refreshes every five hours, up to a weekly cap; Google publishes no exact numbers. One user has reported that each headless `agy -p` call costs 2.5 to 7x more quota than an interactive turn because the prompt cache starts cold ([issue #1411](https://github.com/google-antigravity/antigravity-cli/issues/1411), unconfirmed). The skill tells Claude to make one well-specified call, not many.
- **Account risk**: there are social-media reports of Google banning accounts that used subscription logins through *third-party* tools that copy the OAuth token. This setup only runs Google's own CLI in its documented headless mode, which is the low-risk route, but Google hasn't published a policy that explicitly blesses scripting it.
- **Read-only by default**: Gemini runs in plan mode in your current directory. Approvals it can't get are soft-denied and the run still finishes.
- **Windows**: use WSL or Git Bash (the wrapper is bash).
