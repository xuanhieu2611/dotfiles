# Parallel Pi

A global Pi extension that turns several prompts into separate Herdr worktrees and Pi agents.

## Usage

Reload Pi after installation:

```text
/reload
```

Then submit multiple prompts in one command:

```text
/parallel
Fix the timezone conversion bug when a user changes their profile timezone.

---task---

Improve the settings page hierarchy and spacing without changing behavior.

---task---

Add CSV export to the transactions page.
```

You can also run `/parallel` without arguments. Pi opens a multi-line editor. Separate prompts with a line containing `---task---`.

The extension creates each worktree from the current `HEAD`, starts a Pi agent in each Herdr workspace, submits the prompt, and returns. Use the Herdr sidebar to open agents and continue working with them.

## Behavior

- Requires at least two prompts.
- Generates worktree branches under `pi-parallel/`.
- Derives workspace labels from each prompt's first non-empty line.
- Warns when the current checkout has uncommitted changes because child worktrees cannot see them.
- Leaves worktrees, branches, and Pi sessions in place for manual review and cleanup.
- Uses `HERDR_BIN` when set, then `herdr` from `PATH`, then `~/.local/bin/herdr`.
