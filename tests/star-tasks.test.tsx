import { expect, test } from 'claude-code/testing'

import { addStar, addTask, meter, parse, removeStar, setTaskDone, EMPTY } from '../hooks/board'

const BAND = {
  plugin: 'star-tasks',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const

const RUN = {
  origin: { kind: 'composer' },
  presentation: { isFullscreen: true, columns: 120 },
} as const

const PANE = {
  plugin: 'star-tasks',
  component: 'Pane',
  requestId: 'star-tasks',
  props: {
    title: 'Tasks',
    isFocused: false,
    bodyColumns: 50,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

test('board logic: stars, tasks under stars, removal keeps tasks', () => {
  let b = addStar(EMPTY, 'Ship v1').board
  b = addTask(b, 'S1 write docs').board
  b = addTask(b, 'loose one').board
  expect(b.tasks.map(t => t.star)).toEqual([1, null])
  expect(addTask(b, 'S9 nope').text).toBe('No star S9. Add it with /star add <title>.')
  b = setTaskDone(b, 1, true).board
  expect(b.tasks[0]?.isDone).toBe(true)
  b = removeStar(b, 1).board
  expect(b.stars.length).toBe(0)
  expect(b.tasks[0]?.star).toBe(null)
  expect(parse({ tasks: [{ id: 4, text: 'x' }], junk: 1 }).nextTask).toBe(5)
  expect(meter(1, 2, 8)).toEqual({ solid: '██▓▒', empty: '░░░░' })
})

test('commands write the project file and the band shows and toggles it', async ($, on) => {
  const files = new Map<string, string>()
  on('session.root', () => ({ value: '/proj' }))
  on('fs.exists', (_, e) => ({ value: files.has(e.path) }))
  on('fs.read', (_, e) => {
    const text = files.get(e.path)
    if (text === undefined) throw new Error('ENOENT')
    return { value: text }
  })
  on('fs.write', (_, e) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('tool.register', (_, e) => ({ value: { tool: `mcp__star-tasks__${e.name}` } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/proj', surface: 'desktop', isInteractive: true })

  const star = await $.command.run({ ...RUN, command: 'star', args: 'add Ship v1' })
  expect(star.text).toBe('Added star S1: Ship v1')
  const task = await $.command.run({ ...RUN, command: 'task', args: 'add S1 write docs' })
  expect(task.text).toBe('Added task #1 under S1: write docs')
  expect(JSON.parse(files.get('/proj/.claude/tasks.json') ?? '{}').tasks.length).toBe(1)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: '0/1' }))?.text).toBe('0/1')
    await ui.press({ key: 'expand' })
    expect(await ui.find({ type: 'Text', text: / S1 Ship v1/ })).toBeDefined()
    await ui.press({ key: 'minimize' })
    await ui.unmount()
  }

  const pane = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await pane.press({ key: 'task-1' })
  expect(JSON.parse(files.get('/proj/.claude/tasks.json') ?? '{}').tasks[0].isDone).toBe(true)
  expect((await pane.find({ type: 'Text', text: '1/1 done' }))?.text).toBe('1/1 done')
  await pane.unmount()

  const done = await $.command.run({ ...RUN, command: 'task', args: 'undo 1' })
  expect(done.text).toBe('Reopened: #1 write docs')

  const tool = await $.tool.call({ tool: 'mcp__star-tasks__board', action: 'add_task', text: 'from Claude', star: 1 })
  expect(String(tool.result)).toContain('Added task #2 under S1: from Claude')
})

test('in a Claude project the list is saved in the shared project files folder', async ($, on) => {
  const files = new Map<string, string>()
  on('session.root', () => ({ value: '/home/user' }))
  on('fs.exists', (_, e) => ({ value: e.path.replace(/\/$/, '') === '/mnt/project-files' || files.has(e.path) }))
  on('fs.read', (_, e) => {
    const text = files.get(e.path)
    if (text === undefined) throw new Error('ENOENT')
    return { value: text }
  })
  on('fs.write', (_, e) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('tool.register', (_, e) => ({ value: { tool: `mcp__star-tasks__${e.name}` } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/home/user', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'mcp__star-tasks__board', action: 'add_star', text: 'Launch' })

  expect([...files.keys()]).toEqual(['/mnt/project-files/star-tasks/tasks.json'])
})
