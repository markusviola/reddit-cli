export type StackAction<F> = { type: 'push'; frame: F } | { type: 'pop' };

export function stackReducer<F>(stack: F[], action: StackAction<F>): F[] {
  if (action.type === 'push') return [...stack, action.frame];
  if (stack.length <= 1) return stack;
  return stack.slice(0, -1);
}
