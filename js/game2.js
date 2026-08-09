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
  { text: 'Старший садовник велел оградить квадратную грядку со стороной 6 м. Сколько метров ограды потребуется, чтобы окружить её по всему краю?', options: ['12 м', '24 м', '36 м'], answer: '24 м' },
  { text: 'На рассвете ученикам поручили подготовить квадратный участок со стороной 7 м для душистых трав. Какова площадь этой земли?', options: ['28 м²', '49 м²', '14 м²'], answer: '49 м²' },
  { text: 'Вдоль прямоугольной грядки длиной 8 м и шириной 5 м нужно уложить прочный бортик. Какова его общая длина?', options: ['40 м', '26 м', '13 м'], answer: '26 м' },
  { text: 'Для молодой рассады отвели прямоугольный участок длиной 9 м и шириной 4 м. Какова площадь участка?', options: ['26 м²', '36 м²', '18 м²'], answer: '36 м²' },
  { text: 'На квадратной грядке со стороной 5 м высаживают по одному кусту на каждый квадратный метр. Сколько кустов сможет принять грядка?', options: ['20', '10', '25'], answer: '25' },
  { text: 'Перед вечерним поливом нужно протянуть верёвку по всей границе прямоугольного участка длиной 10 м и шириной 6 м. Какой длины должна быть верёвка?', options: ['60 м', '32 м', '16 м'], answer: '32 м' },
];
const progressGroups = [
  ['square_perimeter', 'square'], ['square_area', 'square'], ['rectangle_perimeter', 'rectangle'], ['rectangle_area', 'rectangle'],
];

export function mountGame2(container, api) {
  let active = true;
  let cardOrder = [];
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
      showCardsInstructions();
    });
  }

  function showCardsInstructions(continueCurrent = false) {
    api.modal({
      title: 'Собери тройку',
      body: '<p>Открывай по три карточки. Найди четыре тройки: <strong>картинка, объяснение и формула</strong>.</p><p>На этом этапе можно ошибаться сколько угодно.</p>',
      actions: [{ label: continueCurrent ? 'Продолжить' : 'Начать', primary: true, onClick: continueCurrent ? () => renderCards() : startCards }],
    });
  }

  function shuffleCards(source) {
    const shuffled = [...source];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function startCards() {
    cardOrder = shuffleCards(order);
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
        <div class="corner-controls corner-controls--left"><button class="secondary-button compact" data-action="instructions">Инструкция</button></div>
        <header class="game-header"><div><p class="eyebrow">Уровень 1 · обучение</p><h1>Собери тройку</h1></div><div class="shape-progress" aria-label="Найдено ${matched.size} из 4">${progressGroups.map(([group, shape]) => `<span class="shape-progress__${shape} ${matched.has(group) ? 'is-found' : ''}"></span>`).join('')}<small>${matched.size}/4</small></div></header>
        <div class="card-grid" aria-label="12 карточек">
          ${cardOrder.map((id) => {
            const isOpen = opened.includes(id) || matched.has(cards[id].group);
            const isMatched = matched.has(cards[id].group);
            return `<button type="button" class="learning-card ${isOpen ? 'is-open' : ''} ${isMatched ? 'is-matched' : ''}" data-card="${id}" ${isMatched ? 'disabled' : ''}>
              <span class="card-back"><img src="${A}game2_card_back.png" alt="Закрытая карточка"></span>
              <span class="card-face card-face--${cards[id].type}">${cardFace(id)}</span>
            </button>`;
          }).join('')}
        </div>
        <p class="feedback game2-card-feedback ${message ? 'is-visible' : ''}" role="status">${message}</p>
        <button type="button" class="secondary-button compact card-return-button" data-action="return">Вернуться в главный зал</button>
      </section>`;
    container.querySelectorAll('.learning-card:not(:disabled)').forEach((element) => element.addEventListener('click', () => openCard(element.dataset.card)));
    container.querySelector('[data-action="instructions"]').addEventListener('click', () => showCardsInstructions(true));
    container.querySelector('[data-action="return"]').addEventListener('click', () => leave(false));
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
      if (!active) return;
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

  function showFarmInstructions(continueCurrent = false) {
    api.modal({
      title: 'Помоги на участке',
      body: '<p>Реши 6 практических задач и выбирай один из трёх ответов.</p><p>Ошибиться можно только один раз. <strong>Вторая ошибка начнёт этот этап заново</strong>, но карточки повторять не придётся.</p>',
      actions: [{ label: continueCurrent ? 'Продолжить' : 'Начать работу', primary: true, onClick: continueCurrent ? () => renderFarm() : startFarm }],
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
        <div class="corner-controls corner-controls--left"><button class="secondary-button compact" data-action="instructions">Инструкция</button><button class="secondary-button compact refusal-button" data-action="give-up">Отказаться от испытания</button></div>
        <header class="game-header"><div><p class="eyebrow">Уровень 2 · испытание</p><h1>Помоги на участке</h1></div><span class="progress-chip">Задача ${questionIndex + 1}/6</span></header>
        <div class="farm-improvements" aria-label="Улучшения хозяйства">
          <img class="farm-improvement farm-improvement--boards ${progress >= 1 ? 'is-grown' : ''}" src="${A}game2_farm_boards.png" alt="Кучка досок">
          <img class="farm-improvement farm-improvement--cut-grass ${progress >= 2 ? 'is-grown' : ''}" src="${A}game2_farm_cut_grass.png" alt="Скошенная трава">
          <img class="farm-improvement farm-improvement--stones ${progress >= 3 ? 'is-grown' : ''}" src="${A}game2_farm_stones.png" alt="Кучка камней">
          <img class="farm-improvement farm-improvement--seedlings ${progress >= 4 ? 'is-grown' : ''}" src="${A}game2_farm_seedlings.png" alt="Рассада">
          <img class="farm-improvement farm-improvement--bush ${progress >= 5 ? 'is-grown' : ''}" src="${A}game2_farm_bush.png" alt="Куст">
          <img class="farm-improvement farm-improvement--rope ${progress >= 6 ? 'is-grown' : ''}" src="${A}game2_farm_rope.png" alt="Моток верёвки">
        </div>
        <div class="ornate-panel farm-task">
          <h2>${item.text}</h2>
          <div class="answer-grid">${item.options.map((option) => `<button type="button" class="answer-button" data-answer="${option}">${option}</button>`).join('')}</div>
          <p class="feedback ${message ? 'is-visible' : ''}" role="status">${message}</p>
        </div>
      </section>`;
    container.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => answerFarm(button.dataset.answer)));
    container.querySelector('[data-action="instructions"]').addEventListener('click', () => showFarmInstructions(true));
    container.querySelector('[data-action="give-up"]').addEventListener('click', () => leave(true));
  }

  function leave(shouldBlock) {
    active = false;
    api.returnToHall('game_02', shouldBlock);
  }

  function answerFarm(answer) {
    const item = questions[questionIndex];
    if (answer === item.answer) {
      playEffect('correct');
      progress += 1;
      questionIndex += 1;
      if (questionIndex >= questions.length) {
        container.querySelector('.farm-improvement--rope')?.classList.add('is-grown');
        const feedback = container.querySelector('.farm-task .feedback');
        if (feedback) { feedback.textContent = 'Верно. Хозяйство полностью восстановлено.'; feedback.classList.add('is-visible'); }
        setTimeout(() => { if (active) showArtifact(); }, 900);
      } else renderFarm('Верно. Участок становится лучше.');
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
