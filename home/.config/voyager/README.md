# Voyager layout

ZSA Voyager layout, kept in Oryx under the name **hieu layout**. Sign in at [configure.zsa.io](https://configure.zsa.io) and open it from **My layouts**. Oryx does not read this folder. This file is the record of what is on the board.

The shared keys match the Corne in `home/.config/corne/README.md`. The Voyager has no extra inner column and no unused outer thumb, so those Corne keys are not here.

Flash from Chrome on that same Oryx page. On a Mac, Keymapp is not required. The layout is saved in the ZSA account, and flashing writes it onto the keyboard. Connect the TRRS cable before USB, and unplug USB before disconnecting the TRRS cable. USB-C goes into the left half. The reset button is on the top edge, near the `3` key.

## Tapping

Set these under **Advanced settings**, then **Tapping (Dual-function)**:

- Tapping term: 200 ms
- Quick tap term: 200 ms
- Hold on other key press: on
- Permissive Hold: off
- Retro Tapping: off
- Chordal Hold: off
- Tap Flow: off

## Base layer

```
Esc   1  2  3  4  5          6  7  8  9  0  Delete
Tab   Q  W  E  R  T          Y  U  I  O  P  Enter
Esc/Ctrl A S D F G          H  J  K  L  ;  '
Shift Z  X  C  V  B          N  M  ,  .  /  Shift
            Cmd  Bksp      Space  hold Symbol
```

The key left of `A` is tap Escape, hold Left Control. Another key pressed while it is down selects Control immediately.

Left thumbs, outer to inner: Command, Backspace. Backspace repeats. Right thumbs, inner to outer: Space, hold Symbol. Enter is the right pinky key on the `P` row. Delete is the top-right key. Semicolon and quote are normal keys on this layer.

Raycast stays Command+Space: left thumb Command, right inner thumb Space.

## Symbol layer

Hold the right outer thumb. This is a hold, not a toggle.

```
·   F1 F2 F3 F4 F5         F6 F7 F8 F9 F10 ·
·   `  -  =  [  ]          ⌥← ·  ·  ⌥→  ·  ·
·   ~  _  +  {  }          ←  ↓  ↑  →  Hyper ·
·   bri- bri+ \ | Opt      Mute Vol- Vol+ · · ·
            ·  ⌥Bksp       ·  ·
```

`⌥←` and `⌥→` are previous word and next word. `⌥Bksp` deletes the previous word. `b` is Option, for a shortcut that still needs the real modifier. Blank keys fall through to the base layer, including `P` and `/`.

`S` is underscore. Minus is on `W`. `=` stays on `E`. The shifted symbols have their own keys. Oryx has no key overrides, so a Shift finger that is still down can turn `` ` `` into `~`. On the Corne, Shift does not change these symbols.

## Hyper

Semicolon on the Symbol layer is the Hyper modifier (Control + Option + Shift + Command). It is not one-shot, and there is no third layer.

Hold the Symbol thumb, press and hold semicolon, then let the thumb go. While semicolon stays down, each letter is a Hyper shortcut. The thumb has to be up before the letter. If it is still down, `T` is `]` and the shortcut is Hyper+`]`.

On the laptop, Right Command is Hyper. Karabiner still applies to every keyboard. This board sends its own Control and Hyper.
