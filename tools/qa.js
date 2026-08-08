const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const checks = [];

function check(condition, label) {
  checks.push(label);
  if (!condition) failures.push(label);
}

const manifest = readJson('ASSET_MANIFEST.json');
const generated = Object.values(manifest.generate_by_codex).flat();
for (const file of generated) {
  const target = path.join(root, 'assets', 'generated', file);
  check(fs.existsSync(target) && fs.statSync(target).size > 1000, `asset ${file}`);
}
for (const file of manifest.existing_files) check(fs.existsSync(path.join(root, file)), `existing ${file}`);

const requiredFiles = ['index.html', 'css/styles.css', 'js/app.js', 'js/audio.js', 'js/state.js', 'js/game1.js', 'js/game2.js', 'js/game3.js'];
for (const file of requiredFiles) check(fs.existsSync(path.join(root, file)), `file ${file}`);

const game1 = readJson('games/game_01/CONTENT.json');
const fixed = game1.level_1.fixed_number_order;
const inventory = game1.level_2.inventory_numbers;
const blanks = Object.values(game1.level_2.blank_cells);
check(fixed.length === 20, 'game1 has 20 fixed tasks');
check(new Set(fixed).size === 20, 'game1 tasks are unique');
check(JSON.stringify([...fixed].sort((a, b) => a - b)) === JSON.stringify(inventory), 'game1 inventory matches level 1');
check(blanks.length === 20 && new Set(blanks).size === 20, 'game1 crossword has 20 unique blanks');
check(JSON.stringify([...blanks].sort((a, b) => a - b)) === JSON.stringify(inventory), 'game1 crossword uses the same 20 numbers');
check(game1.level_2.lives === 5, 'game1 level 2 has 5 attempts');

const expressions = [
  ...game1.level_2.bridges,
  ...Object.values(game1.level_2.squares).flat(),
].map((item) => item.resolved);
for (const expression of expressions) {
  const [left, right] = expression.split('=').map((part) => part.trim());
  const normalized = left.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  check(Function(`"use strict"; return (${normalized})`)() === Number(right), `math ${expression}`);
}

const game2 = readJson('games/game_02/CONTENT.json');
const cardEntries = Object.entries(game2.level_1.cards);
check(cardEntries.length === 12 && new Set(cardEntries.map(([id]) => id)).size === 12, 'game2 has 12 unique cards');
check(game2.level_1.fixed_card_order.length === 12 && new Set(game2.level_1.fixed_card_order).size === 12, 'game2 fixed card order');
const groups = Object.groupBy ? Object.groupBy(cardEntries, ([, card]) => card.group) : cardEntries.reduce((all, entry) => ((all[entry[1].group] ||= []).push(entry), all), {});
check(Object.keys(groups).length === 4, 'game2 has 4 groups');
for (const [name, group] of Object.entries(groups)) {
  check(group.length === 3, `game2 ${name} has 3 cards`);
  check(new Set(group.map(([, card]) => card.type)).size === 3, `game2 ${name} has image text formula`);
}
check(game2.level_2.questions.length === 6, 'game2 has 6 fixed farm tasks');
check(game2.level_2.allowed_mistakes === 1 && game2.level_2.failure_on_mistake_number === 2, 'game2 mistake rules');
const expectedGame2 = ['24 м', '49 м²', '26 м', '36 м²', '25', '32 м'];
check(game2.level_2.questions.every((question, index) => question.answer === expectedGame2[index]), 'game2 mathematical answers');

const game3 = readJson('games/game_03/CONTENT.json');
check(game3.level_1.bell_count === 6 && game3.level_1.tasks.length === 6, 'game3 level 1 has six bells and six tasks');
check(game3.level_1.tasks.every((task) => task.gold_count + task.jade_count === 6), 'game3 level 1 bell totals');
const fractions = ['0', '1/6', '1/3', '1/2', '2/3', '5/6', '1'];
check(JSON.stringify(game3.probability_scale) === JSON.stringify(fractions), 'game3 dial scale');
const probability = (gold) => ['0', '1/6', '1/3', '1/2', '2/3', '5/6', '1'][gold];
check(game3.level_2.tasks.length === 6 && game3.level_2.tasks.every((task) => probability(task.bells.filter((bell) => bell === 'G').length) === task.answer), 'game3 level 2 probabilities');
check(game3.level_2.tasks.every((task) => task.note), 'game3 six melody notes');

const source = requiredFiles.map(read).join('\n');
check(!/React|Vue|Angular|localStorage/.test(source), 'no frameworks or persistent storage');
check(source.includes('./assets/audio/background_music.wav'), 'background music is connected');
check(source.includes('Присоединиться к Ордену'), 'entrance CTA');
check(source.includes('Выбрать можно только одного хранителя'), 'single guardian warning');
check(source.includes('Ты принят в ученики.'), 'final title');
check(source.includes('Исток ещё впереди. Это только начало пути.'), 'final body');

// Second-pass patch checks (PATCH_SINGULARIS_2026-08-08).
const overrides = readJson('PATCH_SINGULARIS_2026-08-08/CONTENT_OVERRIDES.json');
const appSource = read('js/app.js');
const stateSource = read('js/state.js');
const game1Source = read('js/game1.js');
const game2Source = read('js/game2.js');
const game3Source = read('js/game3.js');
const cssSource = read('css/styles.css');
const sealSource = read('assets/generated/game1_math_seal.svg');

for (const asset of ['entrance_join_button_full.png', 'hall_choose_guardian_banner.png', 'hall_leave_button_full.png']) {
  const file = path.join(root, 'assets', 'generated', asset);
  const bytes = fs.readFileSync(file);
  check(bytes[25] === 6, `${asset} has alpha channel`);
  check(appSource.includes(`./assets/generated/`) && appSource.includes(asset), `${asset} is connected`);
}
check(!/image-cta[^]*?<span>Присоединиться к Ордену<\/span>/.test(appSource), 'entrance generated CTA has no visible HTML overlay');
check(appSource.includes('hall_choose_guardian_banner.png') && !appSource.includes('hall_text_frame.png'), 'hall uses short generated banner');
check(overrides.hall.bottom_instructions.every((line) => appSource.includes(line)), 'hall bottom instructions match overrides');
check(stateSource.includes('blocked: { game_01: false, game_02: false, game_03: false }'), 'in-memory blocked state');
check(!stateSource.includes('localStorage') && appSource.includes('blockGame(gameId)'), 'blocked state is session-only and wired');
check(appSource.includes("blocked ? 'disabled' : ''"), 'blocked door is disabled');

check((game1Source.match(/\['(?:TL|TR|BL|BR|TOP|RIGHT|BOTTOM|LEFT)[A-Z_]*'/g) || []).length >= 20, 'game1 has 20 seal slot definitions');
check(game1Source.includes('game1_math_seal.svg') && sealSource.includes('2 +') && sealSource.includes('= 14'), 'game1 exact static SVG seal is connected');
check(game1Source.includes('Array.from({ length: 5 }') && game1Source.includes('life-coin'), 'game1 renders five attempt coins');
check(game1Source.includes("data-action=\"hint\"") && game1Source.includes('Math.floor(Math.random() * empty.length)'), 'game1 one random hint');
check(game1Source.includes('leave(false)') && game1Source.includes('leave(true)') && game1Source.includes("api.returnToHall('game_01', shouldBlock)"), 'game1 return and surrender behaviors');
check(cssSource.includes('transform: rotate(90deg)') && cssSource.includes('.scroll-inventory'), 'game1 bead rotation and inventory styling');

check(overrides.game2.level2.tasks.every((task) => game2Source.includes(task.text)), 'game2 exact patched task texts');
check(overrides.game2.level2.tasks.every((task) => task.options.every((option) => game2Source.includes(option))), 'game2 options preserved');
check(['fence', 'grass', 'border', 'seedlings', 'bushes', 'rope'].every((kind) => game2Source.includes(`farm-improvement--${kind}`)), 'game2 six distinct farm improvements');
check(game2Source.includes('progressGroups') && game2Source.includes('shape-progress'), 'game2 geometry progress icons');
check(game2Source.includes('leave(false)') && game2Source.includes('leave(true)') && game2Source.includes("api.returnToHall('game_02', shouldBlock)"), 'game2 return and refusal behaviors');

check(overrides.game3.level1.tasks.every((task) => game3Source.includes(task.instruction)), 'game3 exact probability instructions');
check(game3Source.includes("'ЗОЛОТОЙ' : 'НЕФРИТОВЫЙ'"), 'game3 Russian bell labels');
check(!game3Source.includes('melody-progress') && !game3Source.includes('Нота ${taskIndex'), 'game3 removed old note progress UI');
check(game3Source.includes('note-progress') && game3Source.includes('leave(true)') && game3Source.includes("api.returnToHall('game_03', shouldBlock)"), 'game3 top notes and refusal behavior');
check(game3Source.includes('playMelody(level2Tasks.map'), 'game3 final six-note melody');

for (const file of ['index.html', 'css/styles.css', 'js/app.js', 'js/audio.js', 'js/state.js', 'js/game1.js', 'js/game2.js', 'js/game3.js']) {
  check(!/\b(?:src|href)=["']\//.test(read(file)), `${file} uses no root-absolute asset paths`);
}

console.log(`QA checks: ${checks.length}; passed: ${checks.length - failures.length}; failed: ${failures.length}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
}
