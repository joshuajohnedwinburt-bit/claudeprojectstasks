#!/usr/bin/env bash
# Installs the ask-gemini command, the /ask-gemini skill and the gemini subagent
# for every Claude Code project (user scope). Re-run to update.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$HOME/.local/bin" "$HOME/.claude/agents" "$HOME/.claude/skills/ask-gemini"
install -m 755 "$here/bin/ask-gemini"           "$HOME/.local/bin/ask-gemini"
install -m 644 "$here/agents/gemini.md"         "$HOME/.claude/agents/gemini.md"
install -m 644 "$here/skills/ask-gemini/SKILL.md" "$HOME/.claude/skills/ask-gemini/SKILL.md"

echo "Installed:"
echo "  ~/.local/bin/ask-gemini"
echo "  ~/.claude/agents/gemini.md"
echo "  ~/.claude/skills/ask-gemini/SKILL.md"

case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *)
  echo; echo "Add ~/.local/bin to your PATH, e.g.:"
  echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc && source ~/.zshrc";;
esac
command -v agy >/dev/null || echo "Next: install the Antigravity CLI (agy) and sign in. See gemini-bridge/README.md."
command -v jq  >/dev/null || echo "Next: brew install jq"
