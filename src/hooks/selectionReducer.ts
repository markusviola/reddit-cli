export type SelectionState = {
  index: number;
};

export type SelectionAction = { type: 'up' } | { type: 'down'; itemCount: number };

export function selectionReducer(state: SelectionState, action: SelectionAction): SelectionState {
  if (action.type === 'up') {
    return { index: Math.max(0, state.index - 1) };
  }
  if (action.itemCount === 0) {
    return { index: 0 };
  }
  return { index: Math.min(action.itemCount - 1, state.index + 1) };
}
