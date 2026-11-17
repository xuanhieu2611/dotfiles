# Tinycast

Tinycast is installed with Homebrew's stable `tinycast` cask. Home Manager links this directory to `~/.config/tinycast` using a writable, out-of-store symlink.

## Shared configuration

`settings.json` sets the interface size to **Large** (110%) and manages these shortcuts and the features they need. Interface sizing scales the launcher text and panels, but not Settings. Use `appearance.interfaceSize` values `standard` (100%), `large` (110%), or `larger` (120%).

| Shortcut | Action |
| --- | --- |
| Command + Space | Open Tinycast |
| Hyper + F | Maximize window |
| Hyper + A | Left half |
| Hyper + D | Right half |
| Hyper + V | Clipboard history |
| Hyper + E | Emoji picker |
| Hyper + S | File search |

Hyper is Control + Option + Shift + Command, supplied by the existing Karabiner Right Command mapping. Tinycast does not need a second Hyper-key remapper.

The Compact Shortcuts bar is empty (`appearance.compactBarCommands` is `[]`). This does not disable the features or their global shortcuts.

Hyper + S opens Tinycast's dedicated file search. Indexed file results are excluded from the main launcher (`fileSearch.showInLauncher` is `false`); selecting its **Search Files** fallback searches using the text already entered. This is Tinycast's file search, not macOS Spotlight.

Maximize fills the usable screen without entering macOS fullscreen or creating a separate Space. Half-window cycling is off, so repeating a half-window shortcut keeps the same frame.

The **hieu custom** preset in `windowManagement.customSizes` centers the active window at **80% width and 95% height** of the usable screen. This is a custom window size, not a multi-app layout. Run it by searching for `hieu custom` in the launcher; no global shortcut is assigned.

This is not a factory reset. Unspecified feature settings retain their local values, including an existing file-search setup. Shortcut maps manage the bindings within their section; removing an entry can clear that binding. Clipboard history, permissions, indexes, and other application data stay outside the repository.

## App launch-or-focus

`app-quicklinks.json` contains portable Quicklink definitions for native application paths:

| Shortcut | Quicklink | Destination |
| --- | --- | --- |
| Hyper + C | Focus Cursor | `/Applications/Cursor.app` |
| Hyper + T | Focus WezTerm | `/Applications/WezTerm.app` |
| Hyper + G | Focus Google Chrome | `/Applications/Google Chrome.app` |

These use the default opener, with **Open in a new window** off. Repeating a shortcut focuses the app instead of hiding it. Quicklinks bypass the visibility-toggle behavior of shortcuts assigned in Tinycast's Applications pane; no shell command is needed.

Tinycast's settings file does not include Quicklink definitions or their shortcut assignments. Import the definitions and assign these three shortcuts once on each Mac. Imports skip existing destinations; reuse matching existing rows, which may have different names.

## Enable on each Mac

1. Apply the dotfiles configuration to create the config link.
2. Open Tinycast and go to **Settings → Backup → Settings File**.
3. Enable **Sync settings file** and choose **Import**, not **Replace**, when prompted.
4. In **Settings → Quicklinks → Import quicklinks**, import `~/.config/tinycast/app-quicklinks.json`.
5. Record Hyper + C, Hyper + T, and Hyper + G on the corresponding Quicklink rows.
6. Grant Accessibility when requested for window management and pasting. Set up other permissions only as needed.

macOS's Command + Space Spotlight shortcut is disabled in `configuration.nix`. Tinycast must be running for these shortcuts to work. File-sync consent, Quicklink shortcut assignments, and macOS permissions must be set up separately on each Mac; reinstalling Tinycast is unnecessary.

While file sync is enabled, edits to `settings.json` apply live. Changes made in Tinycast's settings can also rewrite the file with additional preferences. Review the diff before committing, and keep machine-specific paths and private data out of the shared config.
