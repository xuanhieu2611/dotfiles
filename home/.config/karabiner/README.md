# Karabiner keyboard setup

Developer keyboard bindings for macOS, applied to all keyboards.

## Bindings

- Tap Caps Lock: Escape
- Hold Caps Lock: Left Control
- Right Command: Hyper modifier (Control + Option + Shift + Command)
- Left Command remains the normal Mac shortcut key.
- Semicolon and Quote stay normal keys.

Caps Lock uses a 200 ms tap timeout. Holding it sends Control, and pressing another key while it is down selects Control immediately. `h`, `j`, `k`, `l`, comma, period, and Backspace stay ordinary keys. On the Corne, Hyper is the navigation-layer semicolon key. Right Command is Hyper on this keyboard.

## Raycast setup

Raycast continues to open with Command + Space. Assign direct commands to Hyper shortcuts as needed, for example:

- Hyper + T: WezTerm
- Hyper + G: Google/browser
- Hyper + C: Cursor
- Hyper + V: Clipboard History
- Hyper + E: Emoji
- Hyper + Enter: fullscreen

## Files

- `karabiner.json`: active profile and enabled rule
- `assets/complex_modifications/developer_nav.json`: reusable complex modification
- `automatic_backups/`: local backups, do not copy between Macs

## Validation

```bash
"/Library/Application Support/org.pqrs/Karabiner-Elements/bin/karabiner_cli" \
  --lint-complex-modifications \
  ~/.config/karabiner/assets/complex_modifications/developer_nav.json
```
