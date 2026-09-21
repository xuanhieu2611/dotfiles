# Repository Instructions

This repository contains Hieu's personal macOS dotfiles, managed with nix-darwin, Home Manager, and nix-homebrew.

## Structure

- `flake.nix`: Nix inputs, username, and system assembly
- `configuration.nix`: macOS settings and Homebrew packages
- `home.nix`: CLI packages, shell settings, and managed config links
- `home/.config/`: Neovim, WezTerm, Karabiner, and Herdr configuration
- `home/AGENTS.md`: global agent instructions, separate from this file
- `bootstrap.sh`: first-time setup
- `rebuild.sh`: applies configuration changes

## Important Notes

- Make small, focused changes and preserve the existing style.
- Do not add secrets, credentials, logs, generated files, or machine-specific state.
- Do not hardcode the username outside the existing `user` value in `flake.nix`.
- Do not change Nix state versions or `flake.lock` unless explicitly requested.
- Files under `home/.config/` may be linked to live application configs.
- Update documentation when user-facing behavior or setup changes.
- Never run `bootstrap.sh`, `rebuild.sh`, `darwin-rebuild`, `sudo`, or other system activation commands. The user will apply changes.
- Run a relevant lightweight check when possible, then review the final diff.
