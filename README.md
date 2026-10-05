# Hieu's dotfiles

My personal macOS coding setup, managed with [nix-darwin](https://github.com/nix-darwin/nix-darwin), [Home Manager](https://github.com/nix-community/home-manager), and [nix-homebrew](https://github.com/zhaofengli/nix-homebrew).

One repository gives my Macs the same editor, terminal, shell, command-line tools, applications, and system preferences. It is intentionally a baseline: work apps, databases, credentials, and other machine-specific tools stay local.

## What you get

- **CLI:** Neovim, ripgrep, fd, fzf, jq, LazyGit
- **Shell:** Zsh, autosuggestions, syntax highlighting, Starship
- **Apps:** WezTerm, Karabiner-Elements, Raycast, Herdr
- **Font:** Hack Nerd Font
- **Config:** Neovim, WezTerm, Karabiner, Herdr, Pi, and shared agent instructions
- **macOS:** dark mode, fast key repeat, double-space period substitution disabled, Dock and Finder preferences, tap to click

## Before you use it

These are personal dotfiles, not a general-purpose installer. Fork the repository, read the configuration, and remove anything you do not want before running it.

A few important details:

- The default target is an Apple Silicon Mac.
- Existing Homebrew packages are preserved. This setup does not remove unlisted apps or formulae.
- Declared Homebrew casks may be reinstalled because Homebrew Bundle runs with `--force`.
- Home Manager backs up conflicting existing targets with a `.backup` suffix before linking. Review those backups before removing them. If a backup already exists, activation stops rather than overwriting it; move that backup somewhere safe before retrying.
- `home/AGENTS.md` is the global agent rule for Pi (`~/.pi/agent/AGENTS.md`), Claude Code (`~/.claude/CLAUDE.md`), and Codex (`~/.codex/AGENTS.md`).
- `home/.cursor/rules/global.mdc` is Cursor's global rule. It is a separate file, symlinked to `~/.cursor/rules/global.mdc`. Edit the two files separately.
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

Application configs under `home/` are linked directly into `~/.config`, so editing them here edits the live config. `home/AGENTS.md` is linked the same way to Pi, Claude Code, and Codex. Cursor's rule is linked from `home/.cursor/rules/global.mdc`. On another machine, pull this repo and run `./rebuild.sh` to get the same links. Pi's settings and theme under `home/.pi/agent/` are linked there as well. Pi's entire extensions directory is also linked directly to `home/.pi/agent/extensions/`, so extension edits and newly added files are available after Pi's `/reload`, without rebuilding. Herdr's generated integration lives in this linked directory but is ignored by Git. Pi itself is not installed by this repo. Pi authentication, sessions, caches, and downloaded package code stay in Pi's local runtime directory and are not version-controlled.

Pi package sources are pinned to exact versions in `home/.pi/agent/settings.json`. Review package source before trusting or using it. Package updates should be deliberate changes to those pins. Pi can write runtime fields such as `lastChangelogVersion` into the linked settings; exclude those generated changes from commits.

When `lazy-lock.json` changes, run `:Lazy restore` inside Neovim to use the pinned plugin revisions.

### Rust installed with rustup

Home Manager loads `~/.cargo/env` in zsh when that file exists, so Cargo is available automatically after installing Rust with rustup. Apply `home.nix` changes with `./rebuild.sh`, then open a new terminal. Restarting the computer does not apply configuration changes. Until the rebuild is applied, run `source "$HOME/.cargo/env"` once per terminal session.

## Herdr and Pi integration

After installing Pi and applying the dotfiles, install Herdr's bundled Pi integration:

```bash
herdr integration install pi
herdr integration status
```

You can also install it from Herdr's settings integrations tab. Herdr creates and owns `~/.pi/agent/extensions/herdr-agent-state.ts` (or the equivalent under `PI_CODING_AGENT_DIR`). It reports Pi's lifecycle and session identity for status indicators and session restoration. Because the whole extensions directory is linked to the repo, Herdr writes this file into `home/.pi/agent/extensions/`. Git ignores it: this generated file is deliberately not committed, and installing the integration reproduces it on another machine. Re-run the install command after a Herdr upgrade if status reports it as outdated, then reload or restart Pi. See [Herdr's integration documentation](https://herdr.dev/docs/integrations/).

When migrating an existing extensions directory to the whole-directory link, Home Manager backs up the old directory as `~/.pi/agent/extensions.backup`. Review it for custom extensions you want to keep, then run `herdr integration install pi` again to recreate Herdr's integration in the linked directory. Existing `.backup` targets must be moved somewhere safe before retrying an activation that needs the same backup name.

## Pi quota footer

Tested with `@earendil-works/pi-coding-agent` 1.0.0 and Node.js 24. Install Pi separately, apply the dotfiles configuration, and sign in to the `openai-codex` provider through Pi. Older Pi versions may not expose the authentication, theme, or lifecycle APIs this extension uses. Run `/reload` after editing the footer; no rebuild or Codex CLI installation is needed.

The local `codex-usage.ts` Pi extension replaces the default footer with session cost, context-window usage, and Codex subscription quota windows. It uses Pi's OpenAI Codex auth resolver, then requests `https://chatgpt.com/backend-api/wham/usage` directly. This avoids requiring the Codex CLI or a third-party Pi extension, but the endpoint is an undocumented ChatGPT backend route and may change. The same route appears in [OpenAI's Codex source](https://github.com/openai/codex/blob/main/codex-rs/backend-client/src/client/rate_limit_resets.rs). Quota data requires Pi to be logged in to `openai-codex`; without that, the footer still shows cost and context usage.

The dollar figure is Pi's estimated model cost for the current conversation branch, not your ChatGPT subscription bill or remaining credit balance. Quota readings are Codex subscription allowances, not API-key billing limits. They remain Codex readings even if you select a different provider, and are only as recent as the last successful check.

The footer has two left-aligned lines: model, reasoning level, and context usage on the first; cost and quota windows with reset countdowns on the second. Line gauges use a thicker filled portion and bold percentages. Quota gauges show remaining allowance: green above 60%, yellow at 60% or below, and red at 10% or below. Context gauges show space used, turning yellow at 70% used and red at 90% used. Gauges shrink or disappear on narrow terminals, and countdowns redraw every minute without extra network requests.

Quota refreshes at startup, on model selection, every five minutes after the last refresh, and after Pi finishes its final response (`agent_settled`). Overlapping triggers share one request and queue at most one follow-up. `/codex-usage` also requests a refresh and shows reset times and the last successful check. Temporary failures preserve the last same-account reading with an explicit `stale` label; authentication failures or account changes clear it. Retry timing respects `Retry-After` on HTTP 429/503 and uses bounded backoff for other failures. The endpoint's values are validated rather than interpreting missing or invalid data as unused quota.

Run the quota request and refresh-state tests without contacting OpenAI:

```bash
node --experimental-transform-types --test tests/*.test.ts
```

## What stays machine-specific

Anything not declared here remains untouched and is not copied to another Mac. That can include Teams, `gh`, MySQL, PostgreSQL, Redis, CocoaPods, XcodeGen, Node.js, Xcode, and company tools.

Raycast settings use Raycast Sync or export/import. Credentials and macOS permissions must be set up separately on each machine.

## Make it yours

The main places to customize are:

- `flake.nix` for the username and Nix inputs
- `configuration.nix` for macOS settings and Homebrew packages
- `home.nix` for CLI tools, shell settings, aliases, and managed links
- `home/` for application and Pi configuration

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
