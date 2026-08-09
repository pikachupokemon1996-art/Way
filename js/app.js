import { allGamesCompleted, blockGame, chooseAlliance, completeGame, getState, resetState, setView } from './state.js';
import { initAudio, playEffect } from './audio.js';
import { mountGame1 } from './game1.js?v=crossword-v2';
import { mountGame2 } from './game2.js?v=farm-images-v2';
import { mountGame3 } from './game3.js?v=game3-buttons-v2';

const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const A = './assets/generated/';
const gameMounts = { game_01: mountGame1, game_02: mountGame2, game_03: mountGame3 };
const names = {
  game_01: 'Путь знаков и счёта',
  game_02: 'Путь формы и земли',
  game_03: 'Путь случая и звона',
};

function modal({ title, body, actions, locked = false }) {
  modalRoot.innerHTML = `<div class="modal-backdrop" role="presentation"><section class="modal ornate-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <h2 id="modal-title">${title}</h2><div class="modal__body">${body}</div>
    <div class="modal__actions">${actions.map((action, index) => `<button type="button" class="${action.primary ? 'primary-button' : 'secondary-button'}" data-modal-action="${index}">${action.label}</button>`).join('')}</div>
  </section></div>`;
  modalRoot.querySelectorAll('[data-modal-action]').forEach((button) => button.addEventListener('click', () => {
    const action = actions[Number(button.dataset.modalAction)];
    playEffect('click');
    modalRoot.innerHTML = '';
    action.onClick?.();
  }));
  if (!locked) {
    modalRoot.querySelector('.modal-backdrop').addEventListener('click', (event) => {
      if (event.target === event.currentTarget && actions.length === 0) modalRoot.innerHTML = '';
    });
  }
  setTimeout(() => modalRoot.querySelector('button')?.focus(), 0);
}

function renderEntrance() {
  setView('entrance');
  modalRoot.innerHTML = '';
  app.innerHTML = `
    <section class="scene entrance-scene">
      <div class="entrance-focus">
        <img class="order-emblem" src="${A}order_emblem.png" alt="Эмблема Ордена">
        <button type="button" class="image-cta image-only-button" data-action="enter" aria-label="Присоединиться к Ордену"><img src="${A}entrance_join_button_full.png" alt="Присоединиться к Ордену"></button>
      </div>
    </section>`;
  app.querySelector('[data-action="enter"]').addEventListener('click', () => {
    playEffect('awaken');
    renderHall();
  });
}

function renderHall(showRequiredChoice = false) {
  setView('hall');
  app.innerHTML = `
    <section class="scene hall-scene">
      <header class="hall-banner"><img src="${A}hall_choose_guardian_banner.png" alt="Выбери хранителя"></header>
      <div class="doors" aria-label="Три пути Ордена">
        ${door('game_01', 'door_symbol_coins.png')}
        ${door('game_02', 'door_symbol_agriculture.png')}
        ${door('game_03', 'door_symbol_bells.png')}
      </div>
      <footer class="hall-footer">
        <div class="hall-notes"><p class="warning-text">Выбрать можно только одного хранителя. Делай выбор с умом.</p><p>Ты можешь сначала пройти испытания и узнать каждый путь.</p><p>Если ты ещё не готов принять вызов, можешь уйти.</p></div>
        <button type="button" class="hall-leave image-only-button" data-action="leave" aria-label="Уйти"><img src="${A}hall_leave_button_full.png" alt="Уйти"></button>
      </footer>
    </section>`;
  app.querySelectorAll('[data-game]').forEach((button) => button.addEventListener('click', () => selectGame(button.dataset.game)));
  app.querySelector('[data-action="leave"]').addEventListener('click', () => {
    resetState();
    renderEntrance();
  });
  if (showRequiredChoice || (allGamesCompleted() && !getState().alliance)) showRequiredChoiceDialog();
}

function door(gameId, symbol) {
  const completed = getState().completed[gameId];
  const blocked = getState().blocked[gameId];
  return `<button type="button" class="hall-door ${completed ? 'is-completed' : ''} ${blocked ? 'is-blocked' : ''}" data-game="${gameId}" ${blocked ? 'disabled' : ''}>
    <img class="door-symbol" src="${A}${symbol}" alt="">
    <span class="door-label"><img src="${A}door_label_frame.png" alt=""><strong>${names[gameId]}</strong></span>
    ${completed ? '<span class="completed-mark">Испытание пройдено</span>' : ''}${blocked ? '<span class="blocked-mark">Путь закрыт до перезагрузки</span>' : ''}
  </button>`;
}

function selectGame(gameId) {
  playEffect('click');
  if (getState().completed[gameId] && !getState().alliance) {
    modal({
      title: 'Испытание уже пройдено',
      body: '<p>Ты уже прошёл это испытание.</p>',
      actions: [
        { label: 'Пройти испытание снова', onClick: () => renderGame(gameId) },
        { label: 'Вернуться к предложению союза', primary: true, onClick: () => showArtifactOffer(gameId) },
      ],
    });
    return;
  }
  renderGame(gameId);
}

function gameApi() {
  return {
    modal,
    returnToHall(gameId, shouldBlock = false) {
      if (shouldBlock) blockGame(gameId);
      renderHall();
    },
    finish(gameId, accepted) {
      completeGame(gameId);
      if (accepted) {
        if (chooseAlliance(gameId)) {
          playEffect('awaken');
          renderFinal();
        }
      } else {
        renderHall(allGamesCompleted());
      }
    },
  };
}

function renderGame(gameId) {
  setView(gameId);
  modalRoot.innerHTML = '';
  gameMounts[gameId](app, gameApi());
}

function showArtifactOffer(gameId) {
  setView(gameId);
  const controller = gameMounts[gameId](app, gameApi());
  controller.showArtifact();
}

function showRequiredChoiceDialog() {
  modal({
    title: 'Ты увидел все три пути',
    body: '<p>Но так и не сделал выбор. Одному по жизни идти трудно. Знания помогают расти, но путь легче, когда рядом есть тот, кому доверяешь. Вернись к одному из хранителей и выбери, с кем заключить союз.</p>',
    actions: [{ label: 'Сделать выбор', primary: true, onClick: () => {} }],
    locked: true,
  });
}

function renderFinal() {
  setView('final');
  modalRoot.innerHTML = '';
  app.innerHTML = `
    <section class="scene final-scene">
      <div class="ornate-panel final-panel">
        <img class="order-emblem final-emblem" src="${A}order_emblem.png" alt="Эмблема Ордена">
        <h1>Ты принят в ученики.</h1>
        <h2>Добро пожаловать в Орден.</h2>
        <p>Исток ещё впереди. Это только начало пути.</p>
        <button type="button" class="primary-button" data-action="complete">Завершить посвящение</button>
      </div>
    </section>`;
  app.querySelector('[data-action="complete"]').addEventListener('click', (event) => {
    playEffect('awaken');
    event.currentTarget.textContent = 'Посвящение завершено';
    event.currentTarget.disabled = true;
  });
}

initAudio();
renderEntrance();
