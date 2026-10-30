# star-tasks

Track a project's **stars** (long-running objectives) and **tasks** right inside Claude Code.

- A one-line band above the prompt shows the tracker minimized: a star, one coloured dot per star, `done/total`, and a dithered progress meter. Press **Expand** to see every star with its own meter and the combined task list; click a task to check it off, click a star to filter to its tasks, **Minimize** to fold it back.
- `/task` on its own opens the same view as a pane beside the chat.
- Everything is saved per project in `.claude/tasks.json` at the project root, so it follows the repo (commit it to share it, or add it to `.gitignore` to keep it private).
- Claude gets a `board` tool to read the list, and adds or checks off items only when you ask it to.

## Commands

```
/star add <title>        add a star
/star done <n>           retire star S<n> once it is reached (undo <n>, rm <n>)
/task add [S2] <text>    add a task, under star 2 if given
/task done <n>           check off task #n   (also: /done <n>)
/task undo <n> | rm <n>  reopen or delete task #n
/task list               print everything
/task                    open the tasks pane
```

## Install (Mac)

Unzip this folder somewhere you keep it, for example `~/claude-plugins/star-tasks`, then in a terminal:

```
claude plugin marketplace add ~/claude-plugins/star-tasks
claude plugin install star-tasks@star-tasks
```

Pick the **user** scope so it loads in every project. Restart any running Claude Code session (or run `/reload-plugins`).
