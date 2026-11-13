# Repository Instructions

This repository contains Hieu's personal macOS dotfiles, managed with nix-darwin, Home Manager, and nix-homebrew.

## Structure

- `flake.nix`: Nix inputs, username, and system assembly
- `configuration.nix`: macOS settings and Homebrew packages
- `home.nix`: CLI packages, shell settings, and managed config links
- `home/.config/`: Neovim, WezTerm, Karabiner, Corne, Voyager, and Herdr configuration
- `home/AGENTS.md`: global agent rule for Pi, Claude Code, and Codex. This file is repo-specific and stays separate.
- `home/.cursor/rules/global.mdc`: Cursor's global rule, separate from `home/AGENTS.md`.
- `bootstrap.sh`: first-time setup
- `rebuild.sh`: applies configuration changes

## Keyboards

Two split keyboards share one typing layout. The Corne is configured in Vial. Its layout file is `home/.config/corne/corne.vil`, and the notes are `home/.config/corne/README.md`. The Voyager is configured in Oryx. The notes are `home/.config/voyager/README.md`. Read those files before changing either layout. The Corne has an extra inner column and unused outer thumbs. The Voyager does not.

## Important Notes

- Make small, focused changes and preserve the existing style.
- Use Homebrew for apps that should stay on a current stable release. Keep slower-moving CLI tools in Nix, where versions stay pinned until Nixpkgs is updated.
- Do not add secrets, credentials, logs, generated files, or machine-specific state.
- Do not hardcode the username outside the existing `user` value in `flake.nix`.
- Do not change Nix state versions or `flake.lock` unless explicitly requested.
- Files under `home/.config/` may be linked to live application configs.
- Update documentation when user-facing behavior or setup changes.
- Never run `bootstrap.sh`, `rebuild.sh`, `darwin-rebuild`, `sudo`, or other system activation commands. The user will apply changes.
- Run a relevant lightweight check when possible, then review the final diff.
