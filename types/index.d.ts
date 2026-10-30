export type Star = { id: number; title: string; color: string; isDone: boolean }
export type Task = { id: number; text: string; star: number | null; isDone: boolean }
export type Board = { stars: Star[]; tasks: Task[]; nextStar: number; nextTask: number }

declare module 'claude-code' {
  interface PluginState {
    'star-tasks': {
      board: Shaped<Board>
      isExpanded: boolean
      filter: number | null
      savedAt: string
    }
  }
}
