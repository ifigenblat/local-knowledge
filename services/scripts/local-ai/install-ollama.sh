#!/usr/bin/env bash
# Install Ollama for local AI (used when Provider = Ollama in LocalKnowledge).
# After install: run `ollama serve` (or start Ollama app on macOS), then `ollama pull phi`.

set -e
OLLAMA_URL_LINUX="${OLLAMA_INSTALL_URL:-https://ollama.com/install.sh}"
OLLAMA_DOWNLOAD_MAC="${OLLAMA_DOWNLOAD_MAC:-https://ollama.com/download/Ollama-darwin.zip}"

echo "=== Ollama installer for LocalKnowledge ==="

if command -v ollama &>/dev/null; then
  echo "Ollama is already installed: $(ollama --version 2>/dev/null || ollama -v 2>/dev/null || echo 'unknown')"
  echo "Run: ollama serve    (then in another terminal: ollama pull phi)"
  exit 0
fi

case "$(uname -s)" in
  Linux)
    echo "Installing Ollama on Linux..."
    if command -v curl &>/dev/null; then
      curl -fsSL "$OLLAMA_URL_LINUX" | sh
    else
      echo "Install curl first: sudo apt-get install curl  (or equivalent)"
      exit 1
    fi
    echo "Done. Start the server: ollama serve"
    echo "Then pull a model: ollama pull phi"
    ;;
  Darwin)
    echo "macOS: Install Ollama from the official app or Homebrew."
    if command -v brew &>/dev/null; then
      echo "Installing via Homebrew..."
      brew install ollama
      echo "Done. Start: ollama serve   then: ollama pull phi"
    else
      echo "Download the app: $OLLAMA_DOWNLOAD_MAC"
      echo "Or install Homebrew and run: brew install ollama"
      if command -v open &>/dev/null; then
        open "$OLLAMA_DOWNLOAD_MAC" 2>/dev/null || true
      fi
    fi
    ;;
  *)
    echo "Unsupported OS. Install manually from https://ollama.com"
    exit 1
    ;;
esac
