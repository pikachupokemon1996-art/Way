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

console.log(`QA checks: ${checks.length}; passed: ${checks.length - failures.length}; failed: ${failures.length}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
}
