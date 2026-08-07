import { playEffect } from './audio.js';

const A = './assets/generated/';
const numbers = [59, 24, 78, 32, 17, 72, 27, 40, 84, 18, 56, 39, 12, 43, 28, 54, 22, 42, 26, 36];
const inventory = [12, 17, 18, 22, 24, 26, 27, 28, 32, 36, 39, 40, 42, 43, 54, 56, 59, 72, 78, 84];
const answers = {
  TL_NW: 18, TL_NE: 54, TL_SE: 27, TL_SW: 32, TOP_BRIDGE: 17,
  TR_NW: 56, TR_NE: 28, TR_SE: 84, TR_SW: 22, RIGHT_BRIDGE: 59,
  BR_NW: 26, BR_NE: 78, BR_SE: 39, BR_SW: 40, BOTTOM_BRIDGE: 12,
  BL_NW: 24, BL_NE: 72, BL_SE: 36, BL_SW: 42, LEFT_BRIDGE: 43,
};
const praises = ['Верно!', 'Отлично получилось!', 'Молодец!', 'Так держать!', 'Знак найден!', 'Число собрано правильно!', 'Ты всё сделал верно!', 'Прекрасная работа!', 'Ещё один знак найден!', 'Путь продолжается!'];

const intro = `
  <section class="scene game-scene game1-scene game-intro">
    <div class="ornate-panel intro-panel">
      <p class="eyebrow">Первый путь</p>
      <h1>Испытание знаков и счёта</h1>
      <p>Перед тобой древние счёты. Прежде чем они откроют свой истинный смысл, тебе предстоит научиться читать числа и восстановить математическую печать.</p>
      <img class="intro-artifact wide-artifact" src="${A}game1_abacus_sleeping.png" alt="Древние счёты">
      <button class="primary-button" data-action="start">Начать испытание</button>
    </div>
  </section>`;

function beadRow(color, count) {
  return `<div class="bead-row bead-row--${color}" aria-label="${color === 'white' ? 'Белые бусины — десятки' : 'Чёрные бусины — единицы'}">
    ${Array.from({ length: 9 }, (_, index) => `<button type="button" class="bead ${index < count ? 'is-active' : ''}" data-color="${color}" data-count="${index + 1}" aria-pressed="${index < count}"><img src="${A}game1_bead_${color}.png" alt="${index + 1}"></button>`).join('')}
  </div>`;
}

function scroll(number, extra = '') {
  return `<div class="number-scroll ${extra}" data-number="${number}" draggable="${extra.includes('available')}"><img src="${A}game1_scroll_number.png" alt=""><strong>${number}</strong></div>`;
}

function slot(id) {
  return `<button type="button" class="crossword-slot" data-slot="${id}" aria-label="Пустая клетка ${id}">?</button>`;
}

function block(id, labels) {
  return `<div class="math-block math-block--${id.toLowerCase()}">
    ${slot(`${id}_NW`)}${slot(`${id}_NE`)}${slot(`${id}_SE`)}${slot(`${id}_SW`)}
    <span class="edge edge--north">${labels.north}</span>
    <span class="edge edge--east">${labels.east}</span>
    <span class="edge edge--south">${labels.south}</span>
    <span class="edge edge--west">${labels.west}</span>
  </div>`;
}

export function mountGame1(container, api) {
  let level = 0;
  let taskIndex = 0;
  let tens = 0;
  let ones = 0;
  let busy = false;
  let found = [];
  let lives = 5;
  let placed = {};
  let selected = null;

  function renderIntro() {
    level = 0;
    container.innerHTML = intro;
    container.querySelector('[data-action="start"]').addEventListener('click', () => {
      playEffect('click');
      showInstructions1();
    });
  }

  function showInstructions1() {
    api.modal({
      title: 'Как работать со счётами',
      body: `<p>На счётах два ряда бусин. <strong>Белые бусины обозначают десятки, чёрные — единицы.</strong></p><p>Нажми на нужную бусину в каждом ряду, чтобы выставить количество. Например, для 42 нужны 4 белые и 2 чёрные.</p><p>Ошибаться можно сколько угодно. После каждого правильного ответа ты получишь свиток; все 20 понадобятся дальше.</p>`,
      actions: [{ label: 'Понятно', primary: true, onClick: level === 1 ? () => renderLevel1() : startLevel1 }],
    });
  }

  function startLevel1() {
    level = 1;
    taskIndex = 0;
    tens = 0;
    ones = 0;
    found = [];
    renderLevel1();
  }

  function renderLevel1(message = '') {
    const current = numbers[taskIndex];
    container.innerHTML = `
      <section class="scene game-scene game1-scene game1-level1">
        <header class="game-header"><div><p class="eyebrow">Уровень 1 · обучение</p><h1>Счёты</h1></div><button class="secondary-button compact" data-action="instructions">Инструкция</button></header>
        <div class="task-frame image-frame"><img src="${A}game1_task_frame.png" alt=""><div><span>Собери число</span><strong>${current}</strong></div></div>
        <div class="abacus" aria-label="Интерактивные счёты">
          <img class="abacus__body" src="${A}game1_abacus_sleeping.png" alt="Корпус счётов">
          <div class="abacus__rows">${beadRow('white', tens)}${beadRow('black', ones)}</div>
          <div class="abacus__labels"><span>Десятки · белые</span><span>Единицы · чёрные</span></div>
        </div>
        <div class="game-actions"><button class="secondary-button" data-action="reset">Сбросить</button><button class="primary-button" data-action="check">Проверить</button></div>
        <p class="feedback ${message ? 'is-visible' : ''}" role="status">${message}</p>
        <aside class="scroll-inventory"><h2>Найденные свитки <span>${found.length}/20</span></h2><div class="scroll-grid">${found.map((number) => scroll(number)).join('')}</div></aside>
        <div class="praise-pop" hidden></div>
      </section>`;
    bindLevel1();
  }

  function bindLevel1() {
    container.querySelectorAll('.bead').forEach((bead) => bead.addEventListener('click', () => {
      if (busy) return;
      const count = Number(bead.dataset.count);
      if (bead.dataset.color === 'white') tens = count;
      else ones = count;
      playEffect('click');
      renderLevel1();
    }));
    container.querySelector('[data-action="reset"]').addEventListener('click', () => {
      if (busy) return;
      tens = 0;
      ones = 0;
      playEffect('click');
      renderLevel1();
    });
    container.querySelector('[data-action="check"]').addEventListener('click', checkLevel1);
    container.querySelector('[data-action="instructions"]').addEventListener('click', showInstructions1);
  }

  function checkLevel1() {
    if (busy) return;
    const expected = numbers[taskIndex];
    if (tens * 10 + ones !== expected) {
      playEffect('error');
      renderLevel1('Попробуй ещё раз. Белые бусины показывают десятки, чёрные — единицы.');
      return;
    }
    busy = true;
    playEffect('correct');
    found.push(expected);
    renderLevel1();
    busy = true;
    const praise = container.querySelector('.praise-pop');
    praise.innerHTML = `<img src="${A}game1_praise_frame.png" alt=""><div><strong>${praises[taskIndex % praises.length]}</strong><span>Число ${expected} найдено.</span></div>`;
    praise.hidden = false;
    setTimeout(() => {
      busy = false;
      taskIndex += 1;
      tens = 0;
      ones = 0;
      if (taskIndex >= numbers.length) showLevel1Complete();
      else renderLevel1();
    }, 950);
  }

  function showLevel1Complete() {
    api.modal({
      title: 'Все знаки собраны',
      body: '<p>Ты нашёл все 20 чисел. Теперь им предстоит занять свои места в математической печати.</p><p class="muted">Печать раскрывается...</p>',
      actions: [{ label: 'Восстановить печать', primary: true, onClick: showInstructions2 }],
    });
  }

  function showInstructions2() {
    api.modal({
      title: 'Как восстановить печать',
      body: '<p>Перед тобой связанный математический кроссворд. Перетаскивай 20 свитков в пустые клетки. Угловые числа одновременно участвуют в двух выражениях.</p><p>На этом этапе подсказок по ответам нет. У тебя <strong>5 попыток</strong>; неверный свиток возвращается в инвентарь.</p>',
      actions: [{ label: 'Начать', primary: true, onClick: startLevel2 }],
    });
  }

  function startLevel2() {
    level = 2;
    lives = 5;
    placed = {};
    selected = null;
    renderLevel2();
  }

  function renderLevel2(message = '') {
    const available = inventory.filter((number) => !Object.values(placed).includes(number));
    container.innerHTML = `
      <section class="scene game-scene game1-scene game1-level2">
        <header class="game-header"><div><p class="eyebrow">Уровень 2 · испытание</p><h1>Математическая печать</h1></div><div class="attempts">Попытки: <strong>${lives}</strong></div></header>
        <div class="crossword-shell">
          <img src="${A}game1_crossword_parchment.png" alt="" class="crossword-parchment">
          <div class="crossword-map">
            ${block('TL', { north: '× 3 =', east: '÷ 2 =', south: '− 5 =', west: '+ 14 =' })}
            <div class="bridge bridge--top"><span>2 ×</span>${slot('TOP_BRIDGE')}<span>= 34</span></div>
            ${block('TR', { north: '÷ 2 =', east: '× 3 =', south: '+ 62 =', west: '− 34 =' })}
            <div class="bridge bridge--left"><span>5 +</span>${slot('LEFT_BRIDGE')}<span>= 48</span></div>
            <div class="seal-mark">✦</div>
            <div class="bridge bridge--right"><span>62 −</span>${slot('RIGHT_BRIDGE')}<span>= 3</span></div>
            ${block('BL', { north: '+ 48 =', east: '÷ 2 =', south: '− 6 =', west: '+ 18 =' })}
            <div class="bridge bridge--bottom"><span>2 +</span>${slot('BOTTOM_BRIDGE')}<span>= 14</span></div>
            ${block('BR', { north: '× 3 =', east: '÷ 2 =', south: '− 1 =', west: '+ 14 =' })}
          </div>
        </div>
        <p class="feedback ${message ? 'is-visible' : ''}" role="status">${message}</p>
        <aside class="crossword-inventory"><h2>Инвентарь свитков</h2><div class="scroll-grid">${available.map((number) => scroll(number, `available ${selected === number ? 'is-selected' : ''}`)).join('')}</div></aside>
      </section>`;
    Object.entries(placed).forEach(([id, number]) => {
      const cell = container.querySelector(`[data-slot="${id}"]`);
      if (cell) {
        cell.textContent = number;
        cell.classList.add('is-filled');
      }
    });
    bindLevel2();
  }

  function bindLevel2() {
    container.querySelectorAll('.number-scroll.available').forEach((item) => {
      item.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', item.dataset.number));
      item.addEventListener('click', () => {
        selected = Number(item.dataset.number);
        playEffect('click');
        renderLevel2();
      });
    });
    container.querySelectorAll('.crossword-slot:not(.is-filled)').forEach((cell) => {
      cell.addEventListener('dragover', (event) => event.preventDefault());
      cell.addEventListener('drop', (event) => {
        event.preventDefault();
        attemptDrop(cell.dataset.slot, Number(event.dataTransfer.getData('text/plain')));
      });
      cell.addEventListener('click', () => {
        if (selected !== null) attemptDrop(cell.dataset.slot, selected);
      });
    });
  }

  function attemptDrop(id, number) {
    if (!inventory.includes(number) || Object.values(placed).includes(number)) return;
    if (answers[id] === number) {
      placed[id] = number;
      selected = null;
      playEffect('correct');
      if (Object.keys(placed).length === 20) {
        setTimeout(showArtifact, 350);
      } else renderLevel2('Знак встал на место.');
      return;
    }
    selected = null;
    lives -= 1;
    playEffect('error');
    if (lives <= 0) {
      api.modal({
        title: 'Печать рассыпалась',
        body: '<p>Испытание можно начать заново. Знание укрепляется, когда к нему возвращаются.</p>',
        actions: [{ label: 'Попробовать снова', primary: true, onClick: startLevel2 }],
      });
    } else renderLevel2(lives === 1 ? 'Осталась последняя попытка. Проверь все связанные выражения особенно внимательно.' : 'Печать не принимает этот знак. Проверь выражения вокруг клетки.');
  }

  function showArtifact() {
    playEffect('awaken');
    container.innerHTML = `
      <section class="scene game-scene game1-scene artifact-scene">
        <div class="ornate-panel artifact-panel">
          <p class="eyebrow">Артефакт пробуждён</p><h1>Счёты пробудились</h1>
          <img class="artifact-image artifact-image--wide" src="${A}game1_abacus_awakened.png" alt="Пробуждённые счёты">
          <p>Ты не просто нашёл верные числа. Ты увидел порядок там, где сначала были лишь отдельные знаки.</p>
          <p>Если захочешь, я стану твоим хранителем на пути обучения.</p>
          <p class="warning-text">Помни: союз можно заключить только с одним хранителем. Не спеши с выбором.</p>
          <div class="game-actions"><button class="secondary-button" data-action="decline">Пока не выбирать</button><button class="primary-button" data-action="accept">Заключить союз</button></div>
        </div>
      </section>`;
    container.querySelector('[data-action="accept"]').addEventListener('click', () => api.finish('game_01', true));
    container.querySelector('[data-action="decline"]').addEventListener('click', () => api.finish('game_01', false));
  }

  renderIntro();
  return { showArtifact };
}
