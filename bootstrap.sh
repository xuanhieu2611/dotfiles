#!/usr/bin/env bash
# Prepare a new Apple Silicon Mac and apply this dotfiles configuration.
# Run this once on a new Mac. Use ./rebuild.sh for later changes.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
DOTFILES_LINK="$HOME/.dotfiles"
HOST_LABEL="mac"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This bootstrap script supports macOS only." >&2
  exit 1
fi

if [[ "$(uname -m)" != "arm64" ]]; then
  echo "This configuration currently targets Apple Silicon (aarch64-darwin)." >&2
  echo "Update nixpkgs.hostPlatform in configuration.nix before continuing." >&2
  exit 1
fi

if [[ "$EUID" -eq 0 ]]; then
  echo "Run this script as your normal macOS user, not as root." >&2
  exit 1
fi

echo "==> Step 1: Install Determinate Nix"
if command -v nix >/dev/null 2>&1; then
  echo "    Nix is already installed."
else
  curl --proto '=https' --tlsv1.2 -sSf -L \
    https://install.determinate.systems/nix \
    | sh -s -- install --no-confirm

  # Make Nix available to the remainder of this shell session.
  if [[ -f /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh ]]; then
    set +u
    # shellcheck disable=SC1091
    . /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
    set -u
  fi
fi

if ! command -v nix >/dev/null 2>&1; then
  echo "Nix was installed but is not available in this shell." >&2
  echo "Open a new terminal and run ./bootstrap.sh again." >&2
  exit 1
fi

echo "==> Step 2: Link this repository to $DOTFILES_LINK"
if [[ -e "$DOTFILES_LINK" && ! -L "$DOTFILES_LINK" ]]; then
  echo "$DOTFILES_LINK already exists and is not a symlink." >&2
  echo "Move it somewhere safe, then run this script again." >&2
  exit 1
fi
ln -sfn "$DIR" "$DOTFILES_LINK"

echo "==> Step 3: Verify the configured macOS username"
REAL_USER="$(id -un)"
FLAKE_USER="$(sed -nE 's/^[[:space:]]*user = "([^"]+)";.*/\1/p' "$DIR/flake.nix" | head -n1)"

if [[ -z "$FLAKE_USER" ]]; then
  echo "Could not find the user setting in flake.nix." >&2
  exit 1
fi

if [[ "$FLAKE_USER" != "$REAL_USER" ]]; then
  echo "flake.nix uses '$FLAKE_USER', but the current macOS user is '$REAL_USER'."
  read -r -p "Update flake.nix to use '$REAL_USER'? [y/N] " REPLY
  if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    sed -i '' -E \
      's/^([[:space:]]*user = ")[^"]+(";.*)/\1'"$REAL_USER"'\2/' \
      "$DIR/flake.nix"
    echo "    Updated flake.nix. Review it later with: git diff flake.nix"
  else
    echo "Update the user setting in flake.nix before continuing." >&2
    exit 1
  fi
else
  echo "    flake.nix already matches '$REAL_USER'."
fi

echo "==> Step 4: Apply the first nix-darwin generation"
NIX_BIN="$(command -v nix)"
DARWIN_REBUILD_BIN="$(command -v darwin-rebuild || true)"

if [[ -n "$DARWIN_REBUILD_BIN" ]]; then
  sudo "$DARWIN_REBUILD_BIN" switch --flake "$DOTFILES_LINK#$HOST_LABEL"
else
  sudo "$NIX_BIN" run \
    github:nix-darwin/nix-darwin/nix-darwin-26.05#darwin-rebuild -- \
    switch --flake "$DOTFILES_LINK#$HOST_LABEL"
fi

echo
echo "Bootstrap complete. Use ./rebuild.sh for future changes."
