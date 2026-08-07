import { playEffect } from './audio.js';

const A = './assets/generated/';
const order = ['SQ_P_IMAGE', 'RECT_S_TEXT', 'SQ_S_FORMULA', 'RECT_P_IMAGE', 'SQ_S_TEXT', 'RECT_S_FORMULA', 'SQ_P_FORMULA', 'RECT_P_TEXT', 'SQ_S_IMAGE', 'RECT_S_IMAGE', 'SQ_P_TEXT', 'RECT_P_FORMULA'];
const cards = {
  SQ_P_IMAGE: { group: 'square_perimeter', type: 'image', image: 'game2_square_perimeter.png', label: 'Граница квадратной грядки' },
  SQ_P_TEXT: { group: 'square_perimeter', type: 'text', content: 'Периметр квадрата — сумма длин всех четырёх его сторон.' },
  SQ_P_FORMULA: { group: 'square_perimeter', type: 'formula', content: 'P = 4a' },
  SQ_S_IMAGE: { group: 'square_area', type: 'image', image: 'game2_square_area.png', label: 'Площадь квадратной грядки' },
  SQ_S_TEXT: { group: 'square_area', type: 'text', content: 'Площадь квадрата показывает, сколько места занимает его поверхность.' },
  SQ_S_FORMULA: { group: 'square_area', type: 'formula', content: 'S = a²' },
  RECT_P_IMAGE: { group: 'rectangle_perimeter', type: 'image', image: 'game2_rectangle_perimeter.png', label: 'Граница прямоугольного участка' },
  RECT_P_TEXT: { group: 'rectangle_perimeter', type: 'text', content: 'Периметр прямоугольника — сумма длин всех его сторон.' },
  RECT_P_FORMULA: { group: 'rectangle_perimeter', type: 'formula', content: 'P = 2(a + b)' },
  RECT_S_IMAGE: { group: 'rectangle_area', type: 'image', image: 'game2_rectangle_area.png', label: 'Площадь прямоугольной грядки' },
  RECT_S_TEXT: { group: 'rectangle_area', type: 'text', content: 'Площадь прямоугольника показывает, сколько места занимает его поверхность.' },
  RECT_S_FORMULA: { group: 'rectangle_area', type: 'formula', content: 'S = a × b' },
};
const questions = [
  { scene: 'Нужно огородить квадратную грядку со стороной 6 м.', question: 'Сколько метров ограждения понадобится?', options: ['12 м', '24 м', '36 м'], answer: '24 м' },
  { scene: 'Для посадки трав нужно подготовить квадратный участок со стороной 7 м.', question: 'Какова площадь участка?', options: ['28 м²', '49 м²', '14 м²'], answer: '49 м²' },
  { scene: 'Прямоугольную грядку длиной 8 м и шириной 5 м нужно обнести бортиком.', question: 'Какова общая длина бортика?', options: ['40 м', '26 м', '13 м'], answer: '26 м' },
  { scene: 'Поле для рассады имеет длину 9 м и ширину 4 м.', question: 'Какова площадь поля?', options: ['26 м²', '36 м²', '18 м²'], answer: '36 м²' },
  { scene: 'На квадратной грядке со стороной 5 м высаживают по одному кусту на каждый квадратный метр.', question: 'Сколько кустов можно посадить?', options: ['20', '10', '25'], answer: '25' },
  { scene: 'Для прямоугольного участка длиной 10 м и шириной 6 м готовят верёвку по всей границе.', question: 'Какой длины должна быть верёвка?', options: ['60 м', '32 м', '16 м'], answer: '32 м' },
];

export function mountGame2(container, api) {
  let opened = [];
  let matched = new Set();
  let busy = false;
  let questionIndex = 0;
  let errors = 0;
  let progress = 0;

  function intro() {
    container.innerHTML = `
      <section class="scene game-scene game2-scene game-intro"><div class="ornate-panel intro-panel">
        <p class="eyebrow">Второй путь</p><h1>Испытание формы и земли</h1>
        <p>Земля любит точность. Сначала найди связь между формой, границей и площадью, а затем примени знания в работе.</p>
        <img class="intro-artifact" src="${A}game2_square_sleeping.png" alt="Нефритовый угольник">
        <button class="primary-button" data-action="start">Начать испытание</button>
      </div></section>`;
    container.querySelector('[data-action="start"]').addEventListener('click', () => {
      playEffect('click');
      api.modal({
        title: 'Собери тройку',
        body: '<p>Открывай по три карточки. Найди четыре тройки: <strong>картинка, объяснение и формула</strong>.</p><p>На этом этапе можно ошибаться сколько угодно.</p>',
        actions: [{ label: 'Начать', primary: true, onClick: startCards }],
      });
    });
  }

  function startCards() {
    opened = [];
    matched = new Set();
    busy = false;
    renderCards();
  }

  function cardFace(id) {
    const card = cards[id];
    if (card.type === 'image') return `<img src="${A}${card.image}" alt="${card.label}">`;
    if (card.type === 'formula') return `<strong class="formula">${card.content}</strong>`;
    return `<p>${card.content}</p>`;
  }

  function renderCards(message = '') {
    container.innerHTML = `
      <section class="scene game-scene game2-scene game2-cards">
        <header class="game-header"><div><p class="eyebrow">Уровень 1 · обучение</p><h1>Собери тройку</h1></div><span class="progress-chip">Найдено: ${matched.size}/4</span></header>
        <div class="card-grid" aria-label="12 карточек">
          ${order.map((id) => {
            const isOpen = opened.includes(id) || matched.has(cards[id].group);
            const isMatched = matched.has(cards[id].group);
            return `<button type="button" class="learning-card ${isOpen ? 'is-open' : ''} ${isMatched ? 'is-matched' : ''}" data-card="${id}" ${isMatched ? 'disabled' : ''}>
              <span class="card-back"><img src="${A}game2_card_back.png" alt="Закрытая карточка"></span>
              <span class="card-face card-face--${cards[id].type}">${cardFace(id)}</span>
            </button>`;
          }).join('')}
        </div>
        <p class="feedback ${message ? 'is-visible' : ''}" role="status">${message}</p>
      </section>`;
    container.querySelectorAll('.learning-card:not(:disabled)').forEach((element) => element.addEventListener('click', () => openCard(element.dataset.card)));
  }

  function openCard(id) {
    if (busy || opened.includes(id) || matched.has(cards[id].group) || opened.length >= 3) return;
    playEffect('click');
    opened.push(id);
    renderCards();
    if (opened.length === 3) evaluateTriple();
  }

  function evaluateTriple() {
    busy = true;
    const group = cards[opened[0]].group;
    const correct = opened.every((id) => cards[id].group === group);
    setTimeout(() => {
      if (correct) {
        matched.add(group);
        playEffect('correct');
        opened = [];
        busy = false;
        if (matched.size === 4) showCardsComplete();
        else renderCards('Тройка найдена.');
      } else {
        playEffect('error');
        opened = [];
        busy = false;
        renderCards('Эти карточки не образуют одну тройку.');
      }
    }, 700);
  }

  function showCardsComplete() {
    api.modal({
      title: 'Все четыре связи найдены',
      body: '<p>Пора применить знания на участке.</p>',
      actions: [{ label: 'Перейти на участок', primary: true, onClick: showFarmInstructions }],
    });
  }

  function showFarmInstructions() {
    api.modal({
      title: 'Помоги на участке',
      body: '<p>Реши 6 практических задач и выбирай один из трёх ответов.</p><p>Ошибиться можно только один раз. <strong>Вторая ошибка начнёт этот этап заново</strong>, но карточки повторять не придётся.</p>',
      actions: [{ label: 'Начать работу', primary: true, onClick: startFarm }],
    });
  }

  function startFarm() {
    questionIndex = 0;
    errors = 0;
    progress = 0;
    renderFarm();
  }

  function renderFarm(message = '') {
    const item = questions[questionIndex];
    container.innerHTML = `
      <section class="scene game-scene game2-farm">
        <header class="game-header"><div><p class="eyebrow">Уровень 2 · испытание</p><h1>Помоги на участке</h1></div><span class="progress-chip">Задача ${questionIndex + 1}/6</span></header>
        <div class="farm-improvements" aria-hidden="true">${Array.from({ length: 6 }, (_, index) => `<img class="farm-improvement farm-improvement--${index + 1} ${index < progress ? 'is-grown' : ''}" src="${A}door_symbol_agriculture.png" alt="">`).join('')}</div>
        <div class="ornate-panel farm-task">
          <p>${item.scene}</p><h2>${item.question}</h2>
          <div class="answer-grid">${item.options.map((option) => `<button type="button" class="answer-button" data-answer="${option}">${option}</button>`).join('')}</div>
          <p class="feedback ${message ? 'is-visible' : ''}" role="status">${message}</p>
        </div>
      </section>`;
    container.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => answerFarm(button.dataset.answer)));
  }

  function answerFarm(answer) {
    const item = questions[questionIndex];
    if (answer === item.answer) {
      playEffect('correct');
      progress += 1;
      questionIndex += 1;
      if (questionIndex >= questions.length) setTimeout(showArtifact, 450);
      else renderFarm('Верно. Участок становится лучше.');
      return;
    }
    errors += 1;
    playEffect('error');
    if (errors === 1) {
      renderFarm('Расчёт неверный. Это была единственная допустимая ошибка. Следующий неверный ответ завершит испытание.');
    } else {
      api.modal({
        title: 'Работу нужно начать заново',
        body: '<p>Ты ошибся второй раз. Начни работу на участке заново. Карточный этап уже пройден.</p>',
        actions: [{ label: 'Начать участок заново', primary: true, onClick: startFarm }],
      });
    }
  }

  function showArtifact() {
    playEffect('awaken');
    container.innerHTML = `
      <section class="scene game-scene game2-scene artifact-scene"><div class="ornate-panel artifact-panel">
        <p class="eyebrow">Артефакт пробуждён</p><h1>Угольник пробудился</h1>
        <img class="artifact-image" src="${A}game2_square_awakened.png" alt="Пробуждённый нефритовый угольник">
        <p>Ты научился видеть не только форму, но и то, как знание помогает менять пространство вокруг.</p>
        <p>Если захочешь, я стану твоим хранителем на пути обучения.</p>
        <p class="warning-text">Помни: союз можно заключить только с одним хранителем.</p>
        <div class="game-actions"><button class="secondary-button" data-action="decline">Пока не выбирать</button><button class="primary-button" data-action="accept">Заключить союз</button></div>
      </div></section>`;
    container.querySelector('[data-action="accept"]').addEventListener('click', () => api.finish('game_02', true));
    container.querySelector('[data-action="decline"]').addEventListener('click', () => api.finish('game_02', false));
  }

  intro();
  return { showArtifact };
}
