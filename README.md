# Local test

Build first because `daemon start` forks a detached child that runs the built
Node entrypoint.

```bash
pnpm build
```

## Manual routes

Use this path when you want to attach agents first and connect routes manually.

```bash
node dist/src/bin/aiox.js daemon stop
node dist/src/bin/aiox.js daemon start
node dist/src/bin/aiox.js codex --name codex-smoke
node dist/src/bin/aiox.js claude --name claude-smoke
node dist/src/bin/aiox.js connect claude-smoke codex-smoke
node dist/src/bin/aiox.js connect codex-smoke claude-smoke
node dist/src/bin/aiox.js status
```

## Pair reservation

Use this path when you want a named pair to create the bidirectional routes once
both agents attach.

Terminal A:

```bash
node dist/src/bin/aiox.js daemon stop
node dist/src/bin/aiox.js daemon start
node dist/src/bin/aiox.js pair --name smoke-pair
```

Terminal B:

```bash
node dist/src/bin/aiox.js codex --name codex-smoke --pair smoke-pair
```

Terminal C:

```bash
node dist/src/bin/aiox.js claude --name claude-smoke --pair smoke-pair
```

Terminal A:

```bash
node dist/src/bin/aiox.js status
```
