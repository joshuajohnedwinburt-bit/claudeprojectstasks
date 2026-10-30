import { atom, read, update } from 'claude-code'
import type { ElementTable, Register } from 'claude-code'

import type { Board } from '../types'
import {
  EMPTY,
  activeStars,
  addStar,
  addTask,
  meter,
  parse,
  removeStar,
  removeTask,
  setStarDone,
  setTaskDone,
  starOf,
  summary,
} from './board'
import type { Change } from './board'

const PANE = 'star-tasks'
const LILAC = '#c9b8ff'
const FILE = '.claude/tasks.json'
// A Claude project's threads share this folder and it outlives each thread's
// container, so the list lives there when it exists.
const PROJECT_FILES = '/mnt/project-files/'
const PROJECT_FILE = '/mnt/project-files/star-tasks/tasks.json'

// Change the tag when Board's fields change: it declines what an earlier
// version stored, which outlives a reload.
const board = atom({ plugin: 'star-tasks', key: 'board' } as const, EMPTY, {
  shape: 'board-1',
})
const isExpanded = atom({ plugin: 'star-tasks', key: 'isExpanded' } as const, false)
const filter = atom({ plugin: 'star-tasks', key: 'filter' } as const, null)
const savedAt = atom({ plugin: 'star-tasks', key: 'savedAt' } as const, '')

type Ui = Pick<ElementTable, 'Box' | 'Text' | 'Button'>

const parseText = (text: string): Board | null => {
  if (!text.trim()) return null
  try {
    return parse(JSON.parse(text))
  } catch {
    return null
  }
}

const serialize = (b: Board) => JSON.stringify(b, null, 2) + '\n'

const Meter = ({ ui, done, total, width, color }: {
  ui: Ui; done: number; total: number; width: number; color: string
}) => {
  const { Box, Text } = ui
  const { solid, empty } = meter(done, total, width)

  return (
    <Box flexDirection="row">
      <Text color={color}>{solid}</Text>
      <Text dimColor>{empty}</Text>
    </Box>
  )
}

const Collapsed = ({ ui, b, onExpand }: { ui: Ui; b: Board; onExpand: () => void }) => {
  const { Box, Text, Button } = ui
  const stars = activeStars(b)
  const done = b.tasks.filter(t => t.isDone).length

  if (stars.length === 0 && b.tasks.length === 0) {
    return (
      <Box flexDirection="row" gap={1}>
        <Text color={LILAC}>★</Text>
        <Text weight="semibold">Tasks</Text>
        <Text dimColor>none yet: /star add, /task add</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="row" gap={1} alignItems="center">
      <Text color={LILAC}>★</Text>
      <Text weight="semibold">Tasks</Text>
      <Box flexDirection="row">
        {stars.map(s => <Text color={s.color}>■</Text>)}
      </Box>
      <Text mono color={LILAC}>{`${done}/${b.tasks.length}`}</Text>
      {Meter({ ui, done, total: b.tasks.length, width: 16, color: LILAC })}
      <Button key="expand" label="Expand" plain dimColor onPress={onExpand} />
    </Box>
  )
}

type Actions = {
  onToggleTask: (id: number) => void
  onPickStar: (id: number) => void
  onShowAll: () => void
  onMinimize?: () => void
}

const Expanded = ({ ui, b, f, columns, actions }: {
  ui: Ui; b: Board; f: number | null; columns: number; actions: Actions
}) => {
  const { onToggleTask, onPickStar, onShowAll, onMinimize } = actions
  const { Box, Text, Button } = ui
  const stars = activeStars(b)
  const shown = f === null ? b.tasks : b.tasks.filter(t => t.star === f)
  const done = shown.filter(t => t.isDone).length
  const titleWidth = Math.max(8, Math.min(32, columns - 30))

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="row" gap={1} justifyContent="space-between">
        <Box flexDirection="row" gap={1}>
          <Text color={LILAC}>★</Text>
          <Text weight="semibold">Tasks</Text>
          <Text mono dimColor>{`${done}/${shown.length} done`}</Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          {f !== null && (
            <Button key="all" label="Show all" plain dimColor onPress={onShowAll} />
          )}
          {onMinimize && <Button key="minimize" label="Minimize" plain dimColor onPress={onMinimize} />}
        </Box>
      </Box>

      {stars.length > 0 && (
        <Box flexDirection="column">
          <Text size="caption" dimColor>STARS</Text>
          {stars.map(s => {
            const mine = b.tasks.filter(t => t.star === s.id)
            const mineDone = mine.filter(t => t.isDone).length
            const isActive = f === s.id

            return (
              <Box flexDirection="row" gap={1} alignItems="center">
                <Button key={`star-${s.id}`} plain onPress={() => onPickStar(s.id)}>
                  <Text color={s.color}>{isActive ? '▶' : '■'}</Text>
                  <Text weight={isActive ? 'semibold' : 'regular'} wrap="truncate-end">
                    {` S${s.id} ${s.title.slice(0, titleWidth)}`}
                  </Text>
                </Button>
                {Meter({ ui, done: mineDone, total: mine.length, width: 10, color: s.color })}
                <Text mono dimColor>{`${mineDone}/${mine.length}`}</Text>
              </Box>
            )
          })}
        </Box>
      )}

      <Box flexDirection="column">
        <Text size="caption" dimColor>
          {f === null ? 'ALL TASKS' : `TASKS · S${f}`}
        </Text>
        {shown.length === 0 && <Text dimColor>No tasks here yet: /task add [S1] text</Text>}
        {shown.map(t => {
          const star = starOf(b, t.star)

          return (
            <Box flexDirection="row" gap={1}>
              <Button key={`task-${t.id}`} plain onPress={() => onToggleTask(t.id)}>
                <Text color={t.isDone ? LILAC : undefined}>{t.isDone ? '☑' : '☐'}</Text>
                <Text dimColor={t.isDone} strikethrough={t.isDone}>{` ${t.text}`}</Text>
              </Button>
              <Text mono dimColor>{`#${t.id}`}</Text>
              {star && <Text color={star.color}>{`■ S${star.id}`}</Text>}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

const parseId = (arg: string) => {
  const n = Number(arg.replace(/^[#Ss]/, ''))

  return Number.isInteger(n) && n > 0 ? n : null
}

const TASK_HELP = [
  '/task                 open the tasks pane',
  '/task add [S2] <text> add a task, under star 2 if given',
  '/task done <n>        check off task #n (same as /done <n>)',
  '/task undo <n>        reopen task #n',
  '/task rm <n>          delete task #n',
  '/task list            print everything',
].join('\n')

const STAR_HELP = [
  '/star add <title>     add a star (a long-running objective)',
  '/star done <n>        retire star S<n> once it is reached',
  '/star undo <n>        bring a retired star back',
  '/star rm <n>          delete star S<n>; its tasks stay, without a star',
].join('\n')

type Plan =
  | { kind: 'open' }
  | { kind: 'list' }
  | { kind: 'text'; text: string }
  | { kind: 'apply'; apply: (b: Board) => Change }

const apply = (fn: (b: Board) => Change): Plan => ({ kind: 'apply', apply: fn })
const usage = (text: string): Plan => ({ kind: 'text', text })

// Turns a slash command into what to do, so the hook only does the I/O.
export const plan = (command: string, args: string): Plan => {
  const trimmed = args.trim()
  if (command === 'done') {
    const id = parseId(trimmed)
    return id ? apply(b => setTaskDone(b, id, true)) : usage('Usage: /done <n>')
  }
  const [verb = '', first = ''] = trimmed.split(/\s+/)
  const tail = trimmed.slice(verb.length).trim()
  const id = parseId(first)
  const need = (fn: (n: number) => Plan, help: string) => (id ? fn(id) : usage(help))

  if (command === 'star') {
    switch (verb.toLowerCase()) {
      case 'add':
        return apply(b => addStar(b, tail))
      case 'done':
        return need(n => apply(b => setStarDone(b, n, true)), 'Usage: /star done <n>')
      case 'undo':
        return need(n => apply(b => setStarDone(b, n, false)), 'Usage: /star undo <n>')
      case 'rm':
        return need(n => apply(b => removeStar(b, n)), 'Usage: /star rm <n>')
      default:
        return usage(STAR_HELP)
    }
  }
  switch (verb.toLowerCase()) {
    case '':
      return { kind: 'open' }
    case 'add':
      return apply(b => addTask(b, tail))
    case 'done':
      return need(n => apply(b => setTaskDone(b, n, true)), 'Usage: /task done <n>')
    case 'undo':
      return need(n => apply(b => setTaskDone(b, n, false)), 'Usage: /task undo <n>')
    case 'rm':
      return need(n => apply(b => removeTask(b, n)), 'Usage: /task rm <n>')
    case 'list':
      return { kind: 'list' }
    default:
      return usage(TASK_HELP)
  }
}

export const toolChange = (input: {
  action?: string; text?: string; star?: number; id?: number
}): ((b: Board) => Change) | null => {
  const id = typeof input.id === 'number' ? input.id : 0
  const text = input.text ?? ''
  switch (input.action) {
    case 'add_task':
      return b => addTask(b, input.star ? `S${input.star} ${text}` : text)
    case 'complete_task':
      return b => setTaskDone(b, id, true)
    case 'reopen_task':
      return b => setTaskDone(b, id, false)
    case 'add_star':
      return b => addStar(b, text)
    case 'complete_star':
      return b => setStarDone(b, id, true)
    default:
      return null
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'task',
      description: "Add, check off or list this project's tasks; alone, opens the tasks pane",
      argumentHint: '[add [S<n>] <text> | done <n> | undo <n> | rm <n> | list]',
    })
    await $.command.register({
      name: 'star',
      description: "Add or retire a star, one of this project's long-running objectives",
      argumentHint: 'add <title> | done <n> | undo <n> | rm <n>',
    })
    await $.command.register({ name: 'done', description: 'Check off task #n', argumentHint: '<n>' })
    await $.tool.register({
      name: 'board',
      description:
        "The project's stars (long-running objectives) and tasks, shared by every session in this project. " +
        'Call with action "list" to see them. Add or check off items only when the user asks you to ' +
        'track, add or complete something, or confirms you should. When the user asks to see their ' +
        'tasks, call list and show the result.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'add_task', 'complete_task', 'reopen_task', 'add_star', 'complete_star'],
          },
          text: { type: 'string', description: 'Task text, or star title for add_star' },
          star: { type: 'number', description: 'Star number for add_task (S<n>), optional' },
          id: { type: 'number', description: 'Task or star number for complete/reopen' },
        },
        required: ['action'],
      },
      isDeferred: false,
    })
    const started = await next(e)
    const isProject = await $.fs.exists(PROJECT_FILES).catch(() => false)
    const path = isProject ? PROJECT_FILE : `${await $.session.root()}/${FILE}`
    await update($, savedAt, () => path)
    if (await $.fs.exists(path)) {
      const text = await $.fs.read(path).catch(() => '')
      const loaded = parseText(text)
      if (loaded) await update($, board, () => loaded)
    } else {
      await update($, board, () => EMPTY)
    }

    return started
  })

  on('command.run', { command: ['task', 'star', 'done'] }, async ($, e) => {
    const todo = plan(e.command, e.args)
    if (todo.kind === 'text') return { text: todo.text }
    if (todo.kind === 'open') {
      await $.ui.open({ id: PANE, title: 'Tasks' })
      return { text: 'Tasks pane opened.' }
    }
    const path = (await read($, savedAt)) || `${await $.session.root()}/${FILE}`
    const onDisk = parseText(await $.fs.read(path).catch(() => ''))
    const current = onDisk ?? (await read($, board))
    if (todo.kind === 'list') return { text: summary(current) }
    const change = todo.apply(current)
    if (change.board !== current) await $.fs.write(path, serialize(change.board))
    await update($, board, () => change.board)

    return { text: change.text }
  })

  on('tool.call', { tool: 'mcp__star-tasks__board' }, async ($, e) => {
    const fn = toolChange(e as unknown as Parameters<typeof toolChange>[0])
    const path = (await read($, savedAt)) || `${await $.session.root()}/${FILE}`
    const onDisk = parseText(await $.fs.read(path).catch(() => ''))
    const current = onDisk ?? (await read($, board))
    if (!fn) return { result: summary(current) }
    const change = fn(current)
    if (change.board !== current) await $.fs.write(path, serialize(change.board))
    await update($, board, () => change.board)

    return { result: `${change.text}\n\n${summary(change.board)}` }
  })

  on('ui.render', { component: ['AbovePrompt', 'Pane'] }, async ($, e, next) => {
    const isPane = e.component === 'Pane'
    if (isPane && e.requestId !== PANE) return next(e)
    if (e.component === 'AbovePrompt' && e.props.hasSurvey) return next(e)
    if (e.props.view.agentId !== undefined && !isPane) return next(e)

    const ui = $.ui.resolve(e)
    const b = await read($, board)
    const toggle = async (id: number) => {
      const path = (await read($, savedAt)) || `${await $.session.root()}/${FILE}`
      const current = parseText(await $.fs.read(path).catch(() => '')) ?? (await read($, board))
      const task = current.tasks.find(t => t.id === id)
      const change = setTaskDone(current, id, !task?.isDone)
      if (change.board !== current) await $.fs.write(path, serialize(change.board))
      await update($, board, () => change.board)
    }
    const actions = {
      onToggleTask: (id: number) => void toggle(id),
      onPickStar: (id: number) => void update($, filter, f => (f === id ? null : id)),
      onShowAll: () => void update($, filter, () => null),
    }

    if (isPane) {
      return Expanded({ ui, b, f: await read($, filter), columns: e.props.bodyColumns, actions })
    }
    if (!(await read($, isExpanded))) {
      return Collapsed({ ui, b, onExpand: () => void update($, isExpanded, () => true) })
    }

    return Expanded({
      ui,
      b,
      f: await read($, filter),
      columns: e.props.bodyColumns,
      actions: { ...actions, onMinimize: () => void update($, isExpanded, () => false) },
    })
  })
}
