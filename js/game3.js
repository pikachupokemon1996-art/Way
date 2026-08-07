import { playBell, playEffect } from './audio.js';

const A = './assets/generated/';
const scale = ['0', '1/6', '1/3', '1/2', '2/3', '5/6', '1'];
const level1Tasks = [
  { target: '1/6', gold: 1 }, { target: '1/3', gold: 2 }, { target: '1/2', gold: 3 },
  { target: '2/3', gold: 4 }, { target: '5/6', gold: 5 }, { target: '1', gold: 6 },
];
const level2Tasks = [
  { bells: ['G', 'G', 'G', 'G', 'J', 'J'], answer: '2/3', note: 'C5' },
  { bells: ['J', 'J', 'J', 'J', 'J', 'J'], answer: '0', note: 'D5' },
  { bells: ['G', 'J', 'J', 'J', 'J', 'J'], answer: '1/6', note: 'E5' },
  { bells: ['G', 'G', 'G', 'J', 'J', 'J'], answer: '1/2', note: 'G5' },
  { bells: ['G', 'G', 'J', 'J', 'J', 'J'], answer: '1/3', note: 'A5' },
  { bells: ['G', 'G', 'G', 'G', 'G', 'G'], answer: '1', note: 'C6' },
];

function bellsMarkup(states, ringing = -1, interactive = true) {
  return `<div class="bell-row" aria-label="Шесть колоколов">${states.map((state, index) => `
    <button type="button" class="small-bell ${ringing === index ? 'is-ringing' : ''}" data-bell="${index}" ${interactive ? '' : 'disabled'} aria-label="Колокол ${index + 1}: ${state === 'G' ? 'золотой' : 'нефритовый'}">
      <img src="${A}game3_bell_${state === 'G' ? 'gold' : 'jade'}.png" alt="">
      <span>${state === 'G' ? 'GOLD' : 'JADE'}</span>
    </button>`).join('')}</div>`;
}

export function mountGame3(container, api) {
  let taskIndex = 0;
  let bells = Array(6).fill('J');
  let readyToRing = false;
  let ringing = -1;
  let lessonShown = false;
  let errors = 0;
  let dialIndex = 0;

  function intro() {
    container.innerHTML = `
      <section class="scene game-scene game3-scene game-intro"><div class="ornate-panel intro-panel">
        <p class="eyebrow">Третий путь</p><h1>Испытание случая и звона</h1>
        <p>Не каждый исход можно предсказать. Но случай оставляет следы, если научиться видеть соотношения.</p>
        <img class="intro-artifact" src="${A}game3_central_bell_sleeping.png" alt="Центральный колокол">
        <button class="primary-button" data-action="start">Войти в зал колоколов</button>
      </div></section>`;
    container.querySelector('[data-action="start"]').addEventListener('click', () => {
      playEffect('click');
      api.modal({
        title: 'Создай вероятность',
        body: '<p>Перед тобой 6 колоколов. Кликом меняй каждый: <strong>золотой или нефритовый</strong>.</p><p>Настрой состав под заданную вероятность. После правильной настройки дёрни шнур: случайно прозвучит один из шести колоколов.</p><p>Результат звона не бывает правильным или неправильным — это случайный исход.</p>',
        actions: [{ label: 'Начать', primary: true, onClick: startLevel1 }],
      });
    });
  }

  function startLevel1() {
    taskIndex = 0;
    bells = Array(6).fill('J');
    readyToRing = false;
    lessonShown = false;
    renderLevel1();
  }

  function renderLevel1(message = '') {
    const task = level1Tasks[taskIndex];
    container.innerHTML = `
      <section class="scene game-scene game3-scene game3-level1">
        <header class="game-header"><div><p class="eyebrow">Уровень 1 · обучение</p><h1>Создай вероятность</h1></div><span class="progress-chip">Настройка ${taskIndex + 1}/6</span></header>
        <div class="probability-task ornate-panel"><span>Вероятность золотого звона</span><strong>${task.target}</strong><small>${task.gold} золотых из 6</small></div>
        ${bellsMarkup(bells, ringing, true)}
        <div class="game-actions">
          <button type="button" class="primary-button" data-action="check" ${readyToRing ? 'disabled' : ''}>Проверить настройку</button>
          ${readyToRing ? `<button type="button" class="rope-action" data-action="ring"><img src="${A}game3_rope.png" alt=""><span>Позвонить</span></button>` : ''}
        </div>
        <p class="feedback ${message ? 'is-visible' : ''}" role="status">${message}</p>
        ${lessonShown ? '<p class="lesson-note">Вероятность говорит о шансе, а не предсказывает будущее.</p>' : ''}
      </section>`;
    container.querySelectorAll('[data-bell]').forEach((button) => button.addEventListener('click', () => toggleBell(Number(button.dataset.bell))));
    container.querySelector('[data-action="check"]').addEventListener('click', checkSetup);
    container.querySelector('[data-action="ring"]')?.addEventListener('click', ringRandomBell);
  }

  function toggleBell(index) {
    if (readyToRing || ringing >= 0) return;
    bells[index] = bells[index] === 'G' ? 'J' : 'G';
    playEffect('click');
    renderLevel1();
  }

  function checkSetup() {
    const gold = bells.filter((bell) => bell === 'G').length;
    if (gold !== level1Tasks[taskIndex].gold) {
      playEffect('error');
      renderLevel1('Посчитай, сколько золотых колоколов должно быть среди шести.');
      return;
    }
    readyToRing = true;
    playEffect('correct');
    renderLevel1('Настройка верна. Теперь дёрни шнур.');
  }

  function ringRandomBell() {
    if (!readyToRing || ringing >= 0) return;
    ringing = Math.floor(Math.random() * 6);
    const notes = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'];
    playBell(notes[ringing]);
    lessonShown = true;
    renderLevel1(`Случайно прозвучал ${bells[ringing] === 'G' ? 'золотой' : 'нефритовый'} колокол. Это не ошибка.`);
    setTimeout(() => {
      ringing = -1;
      readyToRing = false;
      taskIndex += 1;
      if (taskIndex >= level1Tasks.length) showLevel2Instructions();
      else {
        bells = Array(6).fill('J');
        renderLevel1();
      }
    }, 950);
  }

  function showLevel2Instructions() {
    api.modal({
      title: 'Услышь закономерность',
      body: '<p>Теперь состав колоколов задаёт испытание. Определи вероятность золотого звона и поверни круг вероятности на нужное значение.</p><p>Ошибиться можно только один раз. Вторая ошибка начнёт заново только этот этап.</p>',
      actions: [{ label: 'Начать', primary: true, onClick: startLevel2 }],
    });
  }

  function startLevel2() {
    taskIndex = 0;
    errors = 0;
    dialIndex = 0;
    renderLevel2();
  }

  function dialMarkup() {
    return `<div class="dial-control" data-dial role="slider" tabindex="0" aria-label="Круг вероятности" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${dialIndex}" aria-valuetext="${scale[dialIndex]}">
      <img class="dial-base" src="${A}game3_probability_dial.png" alt="Круг вероятности">
      <img class="dial-pointer" src="${A}game3_dial_pointer.png" alt="" style="transform: translate(-50%, -83%) rotate(${dialIndex * (360 / 7)}deg)">
      ${scale.map((value, index) => `<span class="dial-label ${index === dialIndex ? 'is-selected' : ''}" style="--angle:${index * (360 / 7)}deg">${value}</span>`).join('')}
      <strong class="dial-value">${scale[dialIndex]}</strong>
    </div>`;
  }

  function renderLevel2(message = '') {
    const task = level2Tasks[taskIndex];
    container.innerHTML = `
      <section class="scene game-scene game3-scene game3-level2">
        <header class="game-header"><div><p class="eyebrow">Уровень 2 · испытание</p><h1>Услышь закономерность</h1></div><span class="progress-chip">Нота ${taskIndex + 1}/6</span></header>
        <div class="bell-question"><h2>Какова вероятность золотого звона?</h2>${bellsMarkup(task.bells, -1, false)}</div>
        ${dialMarkup()}
        <button class="primary-button dial-check" data-action="check">Проверить</button>
        <p class="feedback ${message ? 'is-visible' : ''}" role="status">${message}</p>
        <div class="melody-progress" aria-label="Собрано нот">${Array.from({ length: 6 }, (_, index) => `<span class="${index < taskIndex ? 'is-played' : ''}">♪</span>`).join('')}</div>
      </section>`;
    const dial = container.querySelector('[data-dial]');
    dial.addEventListener('click', selectDialFromPointer);
    dial.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const delta = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
      dialIndex = (dialIndex + delta + scale.length) % scale.length;
      playEffect('click');
      renderLevel2();
      container.querySelector('[data-dial]').focus();
    });
    container.querySelector('[data-action="check"]').addEventListener('click', checkDial);
  }

  function selectDialFromPointer(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    let angle = Math.atan2(x, -y) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    dialIndex = Math.round(angle / (360 / 7)) % 7;
    playEffect('click');
    renderLevel2();
  }

  function checkDial() {
    const task = level2Tasks[taskIndex];
    if (scale[dialIndex] === task.answer) {
      playBell(task.note);
      playEffect('correct');
      taskIndex += 1;
      dialIndex = 0;
      if (taskIndex >= level2Tasks.length) setTimeout(showArtifact, 700);
      else renderLevel2('Верно. Нота вошла в мелодию.');
      return;
    }
    errors += 1;
    playEffect('error');
    if (errors === 1) {
      renderLevel2('Присмотрись к составу колоколов. Это была единственная допустимая ошибка.');
    } else {
      api.modal({
        title: 'Звон рассыпался',
        body: '<p>Начни испытание заново и снова найди закономерность. Первый уровень повторять не нужно.</p>',
        actions: [{ label: 'Начать этап заново', primary: true, onClick: startLevel2 }],
      });
    }
  }

  function showArtifact() {
    playEffect('awaken');
    container.innerHTML = `
      <section class="scene game-scene game3-scene artifact-scene"><div class="ornate-panel artifact-panel">
        <p class="eyebrow">Артефакт пробуждён</p><h1>Колокол пробудился</h1>
        <img class="artifact-image" src="${A}game3_central_bell_awakened.png" alt="Пробуждённый центральный колокол">
        <p>Случай нельзя подчинить. Но можно научиться видеть его закономерности.</p>
        <p>Если захочешь, я стану твоим хранителем на пути обучения.</p>
        <p class="warning-text">Помни: союз можно заключить только с одним хранителем.</p>
        <div class="game-actions"><button class="secondary-button" data-action="decline">Пока не выбирать</button><button class="primary-button" data-action="accept">Заключить союз</button></div>
      </div></section>`;
    container.querySelector('[data-action="accept"]').addEventListener('click', () => api.finish('game_03', true));
    container.querySelector('[data-action="decline"]').addEventListener('click', () => api.finish('game_03', false));
  }

  intro();
  return { showArtifact };
}
