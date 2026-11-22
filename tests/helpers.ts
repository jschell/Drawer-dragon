import { step } from '../src/core/reducer';
import { initialState, type Action, type GameEvent, type GameState } from '../src/core/state';

/** A hatched, named dragon in the care phase. */
export function caring(seed = 1): GameState {
  let s = initialState(seed);
  for (let i = 0; i < 3; i++) s = step(s, { type: 'tapEgg' }).state;
  return step(s, { type: 'name', name: 'Pip' }).state;
}

export function run(s: GameState, actions: Action[]): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  for (const a of actions) {
    const r = step(s, a);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
}

export function ticks(seconds: number): Action[] {
  return Array.from({ length: seconds }, () => ({ type: 'tick', dt: 1 }) as Action);
}
