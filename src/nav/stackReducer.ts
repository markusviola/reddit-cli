export type StackAction<F> = { type: 'push'; frame: F } | { type: 'pop' } | { type: 'update'; updater: (frame: F) => F };

export function stackReducer<F>(stack: F[], action: StackAction<F>): F[] {
  if (action.type === 'push') return [...stack, action.frame];
  if (action.type === 'update') {
    const top = stack[stack.length - 1];
    if (top === undefined) return stack;
    return [...stack.slice(0, -1), action.updater(top)];
  }
  if (stack.length <= 1) return stack;
  return stack.slice(0, -1);
}
