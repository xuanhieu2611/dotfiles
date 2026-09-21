# macOS dotfiles

A small, opinionated baseline for a consistent coding environment across Apple Silicon Macs. It uses [Nix](https://nixos.org/), [nix-darwin](https://github.com/nix-darwin/nix-darwin), [Home Manager](https://github.com/nix-community/home-manager), and [nix-homebrew](https://github.com/zhaofengli/nix-homebrew).

The goal is not to control everything on a machine. Shared coding tools and settings live here, while work-specific applications, databases, credentials, and sessions stay local.

## What it installs

### Nix and Home Manager

- Neovim
- ripgrep
- fd
- fzf
- jq
- LazyGit
- Starship
- Zsh autosuggestions and syntax highlighting
- Hack Nerd Font

### Homebrew

Formula:

- Herdr

Casks:

- WezTerm
- Karabiner-Elements
- Raycast

### Managed configuration

- Neovim
- WezTerm
- Karabiner-Elements
- Herdr
- Zsh and Starship
- Shared agent instructions
- Selected macOS defaults

Raycast preferences, credentials, SSH keys, login sessions, and application permissions are intentionally not stored in Git.

## Design choices

- Existing Homebrew packages are preserved with `homebrew.onActivation.cleanup = "none"`.
- Shared command-line tools come from Nix.
- macOS applications come from Homebrew casks.
- Machine-specific tools can still be installed manually with Homebrew.
- Editable application configs use out-of-store symlinks back to this repository.
- Package and input versions are pinned by `flake.lock`.

## Requirements

- An Apple Silicon Mac
- An administrator account
- Internet access
- Git, usually provided by Apple's Command Line Tools

On a brand-new Mac, running `git` may prompt you to install the Command Line Tools. You can also start that installation with:

```bash
xcode-select --install
```

## Before installing

This setup takes ownership of these paths when present:

```text
~/.zshrc
~/.config/nvim
~/.config/wezterm
~/.config/herdr
~/.config/karabiner
~/.claude/CLAUDE.md
~/.pi/agent/AGENTS.md
```

Back up existing versions before the first activation. Home Manager will normally stop rather than silently overwrite conflicting files.

If you already use Homebrew, `nix-homebrew` will migrate the existing installation. Unlisted formulae and casks are preserved, but the declared casks may be reinstalled because this configuration intentionally passes `--force` to Homebrew Bundle.

Back up important database data independently before changing package-management infrastructure.

## Installation

Fork the repository first if you want to maintain your own version. Then clone it somewhere other than `~/.dotfiles`:

```bash
mkdir -p ~/code
git clone https://github.com/YOUR-USERNAME/dotfiles.git ~/code/dotfiles
cd ~/code/dotfiles
./bootstrap.sh
```

To try this repository directly without a fork:

```bash
mkdir -p ~/code
git clone https://github.com/xuanhieu2611/dotfiles.git ~/code/dotfiles
cd ~/code/dotfiles
./bootstrap.sh
```

The bootstrap script:

1. Verifies that the machine is an Apple Silicon Mac.
2. Installs Determinate Nix when needed.
3. Links the checkout to `~/.dotfiles`.
4. Compares the configured username with the current macOS username.
5. Offers to update the single username line in `flake.nix` when they differ.
6. Performs the first nix-darwin activation.

If bootstrap changes the username, commit that change to your own fork. This repository keeps `hieule` as its canonical username.

## Daily use

After pulling shared changes, rebuild the system:

```bash
git pull
./rebuild.sh
```

To change the setup:

```bash
# Edit configuration files
git diff
./rebuild.sh
git add path/to/changed-file
git commit -m "Describe the change"
git push
```

Configuration files linked with `mkOutOfStoreSymlink` are edited directly in this repository. Many application-level changes are visible immediately, while Nix and system changes require `./rebuild.sh`.

When `home/.config/nvim/lazy-lock.json` changes, restore the pinned plugin revisions inside Neovim:

```vim
:Lazy restore
```

## Machine-specific software

Anything not declared here remains local to each machine. Examples include:

- Teams and other work applications
- MySQL, PostgreSQL, and Redis
- CocoaPods and XcodeGen
- `gh`
- Company-specific CLI tools
- Node.js and NVM
- Xcode and language SDKs

Because Homebrew cleanup is disabled, rebuilding this configuration does not remove those unlisted packages.

## Useful commands

Validate the flake without building:

```bash
nix flake check --no-build
```

Preview the system build:

```bash
nix build .#darwinConfigurations.mac.system --dry-run
```

Inspect the active system closure size:

```bash
nix path-info -Sh "$(readlink -f /run/current-system)"
```

Preview removable Nix store paths:

```bash
nix store gc --dry-run
```

## Repository layout

```text
.
├── bootstrap.sh        # First installation on a Mac
├── rebuild.sh          # Apply later changes
├── flake.nix           # Inputs, username, and system assembly
├── configuration.nix   # nix-darwin, macOS, and Homebrew settings
├── home.nix            # Home Manager packages and links
└── home/               # Editable application configuration
```

## Notes

- The configuration currently targets `aarch64-darwin`. Intel Macs require a separate host platform.
- The `cc` and `cs` aliases expect separately installed tools and are harmless when those tools are absent.
- Karabiner and Raycast still require macOS permissions to be granted manually.
- Raycast settings should be transferred with Raycast Sync or its export/import feature.

## Inspiration

This setup was inspired by [Kun Chen's dotfiles](https://github.com/kunchenguid/dotfiles), with a more conservative Homebrew cleanup policy for machines that also contain local work or personal tools.

## License

[MIT](LICENSE)
