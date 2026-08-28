#!/usr/bin/env bash
set -euo pipefail

SKILL_NAME="open-zzjilu-mcp-workflow"
REPO="stelaino/open-zzjilu-mcp-server"
BRANCH="main"
SKILL_FILES=("SKILL.md" "01-tools-reference.md" "02-workflows.md")

RAW_BASE="https://raw.githubusercontent.com/$REPO/$BRANCH/skills/$SKILL_NAME"

INSTALLED=0

install_to() {
  local target_dir="$1/$SKILL_NAME"
  local label="$2"
  mkdir -p "$target_dir"
  for f in "${SKILL_FILES[@]}"; do
    curl -fsSL "$RAW_BASE/$f" -o "$target_dir/$f"
  done
  echo "  ✓ $label → $target_dir"
  INSTALLED=$((INSTALLED + 1))
}

echo "Installing $SKILL_NAME skill from github.com/$REPO ..."
echo ""

install_to "$HOME/.agents/skills" "agents (通用)"

[ -d "$HOME/.cursor" ] && install_to "$HOME/.cursor/skills" "Cursor"
[ -d "$HOME/.claude" ] && install_to "$HOME/.claude/skills" "Claude Code"
[ -d "$HOME/.codex" ] && install_to "$HOME/.codex/skills" "Codex"

echo ""
echo "Done. Installed to $INSTALLED location(s)."
