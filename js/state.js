export const initialState = Object.freeze({
  completed: { game_01: false, game_02: false, game_03: false },
  blocked: { game_01: false, game_02: false, game_03: false },
  alliance: null,
  currentView: 'entrance',
  musicEnabled: true,
});

const cloneInitial = () => ({
  completed: { ...initialState.completed },
  blocked: { ...initialState.blocked },
  alliance: initialState.alliance,
  currentView: initialState.currentView,
  musicEnabled: initialState.musicEnabled,
});

let state = cloneInitial();

export function getState() {
  return state;
}

export function setView(currentView) {
  state.currentView = currentView;
}

export function setMusicEnabled(enabled) {
  state.musicEnabled = Boolean(enabled);
}

export function completeGame(gameId) {
  state.completed[gameId] = true;
}

export function blockGame(gameId) {
  state.blocked[gameId] = true;
}

export function chooseAlliance(gameId) {
  if (state.alliance && state.alliance !== gameId) return false;
  state.alliance = gameId;
  return true;
}

export function allGamesCompleted() {
  return Object.values(state.completed).every(Boolean);
}

export function resetState() {
  state = cloneInitial();
  return state;
}
