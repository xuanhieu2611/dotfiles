# Hieu's dotfiles

My personal macOS coding setup, managed with [nix-darwin](https://github.com/nix-darwin/nix-darwin), [Home Manager](https://github.com/nix-community/home-manager), and [nix-homebrew](https://github.com/zhaofengli/nix-homebrew).

One repository gives my Macs the same editor, terminal, shell, command-line tools, applications, and system preferences. It is intentionally a baseline: work apps, databases, credentials, and other machine-specific tools stay local.

## What you get

- **CLI:** Neovim, ripgrep, fd, fzf, jq, LazyGit
- **Shell:** Zsh, autosuggestions, syntax highlighting, Starship
- **Apps:** WezTerm, Karabiner-Elements, Raycast, Herdr
- **Font:** Hack Nerd Font
- **Config:** Neovim, WezTerm, Karabiner, Herdr, and shared agent instructions
- **macOS:** dark mode, fast key repeat, Dock and Finder preferences, tap to click

## Before you use it

These are personal dotfiles, not a general-purpose installer. Fork the repository, read the configuration, and remove anything you do not want before running it.

A few important details:

- The default target is an Apple Silicon Mac.
- Existing Homebrew packages are preserved. This setup does not remove unlisted apps or formulae.
- Declared Homebrew casks may be reinstalled because Homebrew Bundle runs with `--force`.
- Existing managed files such as `~/.zshrc` and `~/.config/nvim` should be backed up first.
- `home/AGENTS.md` contains my agent instructions. Review or replace it.
- The `cc` alias runs Claude with `--dangerously-skip-permissions`. Know what that means before using it.
- Credentials, SSH keys, Git identity, sessions, and application permissions are not included.

## Fresh Mac setup

Git may first ask you to install Apple's Command Line Tools. You can also start that manually:

```bash
xcode-select --install
```

Fork this repository, then clone your fork somewhere other than `~/.dotfiles`:

```bash
mkdir -p ~/code
git clone https://github.com/YOUR-USERNAME/dotfiles.git ~/code/dotfiles
cd ~/code/dotfiles
./bootstrap.sh
```

`bootstrap.sh` installs Determinate Nix, links the repository to `~/.dotfiles`, checks your macOS username, and performs the first nix-darwin activation.

The canonical username is set once in `flake.nix`:

```nix
user = "hieule";
```

If your username differs, bootstrap offers to update it. Commit that change to your fork.

## Daily use

Pull changes and apply the setup:

```bash
git pull
./rebuild.sh
```

To change the setup, edit the repository and rebuild:

```bash
./rebuild.sh
git diff
git add path/to/file
git commit -m "Describe the change"
git push
```

Application configs under `home/` are linked directly into `~/.config`, so editing them here edits the live config. Package, shell, and system changes require a rebuild.

When `lazy-lock.json` changes, run this inside Neovim to use the pinned plugin revisions:

```vim
:Lazy restore
```

## What stays machine-specific

Anything not declared here remains untouched and is not copied to another Mac. That can include Teams, `gh`, MySQL, PostgreSQL, Redis, CocoaPods, XcodeGen, Node.js, Xcode, and company tools.

Raycast settings use Raycast Sync or export/import. Credentials and macOS permissions must be set up separately on each machine.

## Make it yours

The main places to customize are:

- `flake.nix` for the username and Nix inputs
- `configuration.nix` for macOS settings and Homebrew packages
- `home.nix` for CLI tools, shell settings, aliases, and managed links
- `home/` for application configuration

Intel Macs need `nixpkgs.hostPlatform = "x86_64-darwin"` in `configuration.nix`.

## Repository layout

```text
.
├── bootstrap.sh        # First installation
├── rebuild.sh          # Apply later changes
├── flake.nix           # Inputs and system assembly
├── configuration.nix   # macOS and Homebrew
├── home.nix            # Packages, shell, and links
└── home/               # Application configuration
```

## Inspiration

Inspired by [Kun Chen's dotfiles](https://github.com/kunchenguid/dotfiles) and [Mathias Bynens' dotfiles](https://github.com/mathiasbynens/dotfiles).

## License

[MIT](LICENSE)
