import type { Board, Star, Task } from '../types'

export const EMPTY: Board = { stars: [], tasks: [], nextStar: 1, nextTask: 1 }

const PALETTE = ['#c9b8ff', '#f0a88c', '#9fe0c2', '#8cc8f0', '#f0d58c', '#f09cc8']
const colorFor = (id: number) => PALETTE[(id - 1) % PALETTE.length] ?? '#c9b8ff'

export type Change = { board: Board; text: string }

// Accepts whatever JSON a file held and keeps only well-formed rows.
export const parse = (raw: unknown): Board => {
  if (typeof raw !== 'object' || raw === null) return EMPTY
  const value = raw as Partial<Board>
  const stars = Array.isArray(value.stars)
    ? value.stars.filter(
        (s): s is Star => typeof s?.id === 'number' && typeof s?.title === 'string',
      )
    : []
  const tasks = Array.isArray(value.tasks)
    ? value.tasks.filter(
        (t): t is Task => typeof t?.id === 'number' && typeof t?.text === 'string',
      )
    : []
  const nextStar = Math.max(value.nextStar ?? 1, ...stars.map(s => s.id + 1))
  const nextTask = Math.max(value.nextTask ?? 1, ...tasks.map(t => t.id + 1))

  return {
    stars: stars.map(s => ({
      id: s.id,
      title: s.title,
      color: typeof s.color === 'string' ? s.color : colorFor(s.id),
      isDone: s.isDone === true,
    })),
    tasks: tasks.map(t => ({
      id: t.id,
      text: t.text,
      star: typeof t.star === 'number' ? t.star : null,
      isDone: t.isDone === true,
    })),
    nextStar,
    nextTask,
  }
}

export const activeStars = (board: Board): Star[] => board.stars.filter(s => !s.isDone)

export const starOf = (board: Board, id: number | null): Star | undefined =>
  id === null ? undefined : board.stars.find(s => s.id === id)

export const addStar = (board: Board, title: string): Change => {
  const clean = title.trim()
  if (!clean) return { board, text: 'Usage: /star add <title>' }
  const id = board.nextStar
  const used = new Set(activeStars(board).map(s => s.color))
  const color = PALETTE.find(c => !used.has(c)) ?? colorFor(id)
  const star: Star = { id, title: clean, color, isDone: false }

  return {
    board: { ...board, stars: [...board.stars, star], nextStar: id + 1 },
    text: `Added star S${id}: ${clean}`,
  }
}

export const setStarDone = (board: Board, id: number, isDone: boolean): Change => {
  const star = starOf(board, id)
  if (!star) return { board, text: `No star S${id}.` }

  return {
    board: {
      ...board,
      stars: board.stars.map(s => (s.id === id ? { ...s, isDone } : s)),
    },
    text: isDone ? `Reached star S${id}: ${star.title}` : `Reopened star S${id}`,
  }
}

export const removeStar = (board: Board, id: number): Change => {
  if (!starOf(board, id)) return { board, text: `No star S${id}.` }

  return {
    board: {
      ...board,
      stars: board.stars.filter(s => s.id !== id),
      tasks: board.tasks.map(t => (t.star === id ? { ...t, star: null } : t)),
    },
    text: `Removed star S${id}; its tasks are kept without a star.`,
  }
}

// "S2 write the docs" puts the task under star 2; plain text has no star.
export const addTask = (board: Board, input: string): Change => {
  const match = /^\s*[Ss](\d+)\s+(.*)$/.exec(input)
  const star = match ? Number(match[1]) : null
  const text = (match ? match[2] ?? '' : input).trim()
  if (!text) return { board, text: 'Usage: /task add [S<n>] <text>' }
  if (star !== null && !starOf(board, star)) {
    return { board, text: `No star S${star}. Add it with /star add <title>.` }
  }
  const id = board.nextTask
  const task: Task = { id, text, star, isDone: false }

  return {
    board: { ...board, tasks: [...board.tasks, task], nextTask: id + 1 },
    text: `Added task #${id}${star ? ` under S${star}` : ''}: ${text}`,
  }
}

export const setTaskDone = (board: Board, id: number, isDone: boolean): Change => {
  const task = board.tasks.find(t => t.id === id)
  if (!task) return { board, text: `No task #${id}.` }

  return {
    board: {
      ...board,
      tasks: board.tasks.map(t => (t.id === id ? { ...t, isDone } : t)),
    },
    text: `${isDone ? 'Done' : 'Reopened'}: #${id} ${task.text}`,
  }
}

export const removeTask = (board: Board, id: number): Change => {
  if (!board.tasks.some(t => t.id === id)) return { board, text: `No task #${id}.` }

  return {
    board: { ...board, tasks: board.tasks.filter(t => t.id !== id) },
    text: `Removed task #${id}.`,
  }
}

export const summary = (board: Board): string => {
  const stars = activeStars(board)
  if (stars.length === 0 && board.tasks.length === 0) {
    return 'No stars or tasks yet. Ask Claude to add a star or a task, or use /star add <title> and /task add <text>.'
  }
  const lines: string[] = []
  if (stars.length > 0) {
    lines.push('Stars:')
    for (const s of stars) {
      const mine = board.tasks.filter(t => t.star === s.id)
      lines.push(`  S${s.id} ${s.title} (${mine.filter(t => t.isDone).length}/${mine.length})`)
    }
  }
  if (board.tasks.length > 0) {
    lines.push('Tasks:')
    for (const t of board.tasks) {
      lines.push(`  ${t.isDone ? '[x]' : '[ ]'} #${t.id} ${t.text}${t.star ? ` (S${t.star})` : ''}`)
    }
  }

  return lines.join('\n')
}

// Dithered meter: solid cells, a soft edge, then dim empty cells.
export const meter = (done: number, total: number, width: number) => {
  const filled = total > 0 ? Math.round((done / total) * width) : 0
  const edge = Math.min(filled, 2)
  const solid = '█'.repeat(filled - edge) + '▓▒'.slice(0, edge)

  return { solid, empty: '░'.repeat(width - filled) }
}
