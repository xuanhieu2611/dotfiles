# Karabiner keyboard setup

Developer keyboard bindings for macOS, applied to all keyboards.

## Bindings

- Tap Caps Lock: Escape
- Hold Caps Lock: Left Control
- Shift + Caps Lock: real Caps Lock
- Hold Caps Lock for the navigation layer
  - `h/j/k/l`: left/down/up/right arrows
  - `,/.`: previous/next word
  - Backspace: delete the previous word
  - Shift remains available for text selection
- Tap `/`: slash as normal
- Hold `/`: Hyper modifier (Control + Option + Shift + Command)
- Right and Left Command remain normal Mac shortcut keys.

Caps Lock and slash use a 200 ms tap timeout. Navigation mappings only override the corresponding Caps-based Control chords; the physical Left Control key retains its normal behavior. Slash-based Hyper shortcuts should favor left-hand keys for comfortable cross-hand chords.

## Raycast setup

Raycast continues to open with Command + Space. Assign direct commands to Hyper shortcuts as needed, for example:

- Hyper + V: Clipboard History
- Hyper + T: WezTerm
- Hyper + G: Google/browser
- Hyper + C: Cursor
- Hyper + A/D/W: left half, right half, and maximize

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
