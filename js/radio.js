const RADIO_STRINGS = {
  floor_1: [
    "Слышишь? Это не вентиляция.",
    "Они знают, что ты здесь.",
    "Цех не прощает ошибок.",
    "Держи оружие наготове.",
    "Сборка завершена. Теперь разборка.",
    "Свет мигает не просто так."
  ],
  floor_2: [
    "Здесь было тихо. Больше не будет.",
    "Холод проникает под кожу.",
    "Они стали быстрее. Ты тоже должен.",
    "Следы на инее. Они свежие.",
    "Не задерживайся, замёрзнешь.",
    "Двери закрыты, но это их не остановит."
  ],
  floor_3: [
    "Слишком жарко. И будет ещё жарче.",
    "Пепел оседает на стенах.",
    "Давление растет. Как и их число.",
    "Пламя не очистит это место.",
    "Шаги эхом отскакивают от труб.",
    "Смотри под ноги, металл плавится."
  ],
  floor_4: [
    "Оно пульсирует.",
    "Центр ближе, чем кажется.",
    "Тьма сгущается.",
    "Мясорубка требует больше.",
    "Сердце не остановится само.",
    "Конец уже близок."
  ],
  legendary: [
    "Это... нечто особенное.",
    "Сила. Чистая сила.",
    "Похоже, удача на твоей стороне.",
    "Такое не валяется на полу.",
    "Используй с умом. Или умри."
  ]
};

let activeRadioMessage = null;
let pendingRadioMessage = null;
let radioTimer = 0;
let pendingRadioTimer = 0;

function queueRadioMessage(type) {
  let pool = [];
  if (type === 0) pool = RADIO_STRINGS.floor_1;
  else if (type === 1) pool = RADIO_STRINGS.floor_2;
  else if (type === 2) pool = RADIO_STRINGS.floor_3;
  else if (type === 3) pool = RADIO_STRINGS.floor_4;
  else if (type === 'legendary') pool = RADIO_STRINGS.legendary;
  else return;

  const msg = pool[Math.floor(Math.random() * pool.length)];

  // Floor messages have a delay so they appear after the floor banner
  if (type === 'legendary') {
    activeRadioMessage = msg;
    radioTimer = 3.5;
  } else {
    pendingRadioMessage = msg;
    pendingRadioTimer = 1.5; // Wait 1.5s before showing
  }
}

function updateRadio(dt) {
  if (pendingRadioMessage) {
    pendingRadioTimer -= dt;
    if (pendingRadioTimer <= 0) {
      activeRadioMessage = pendingRadioMessage;
      radioTimer = 4.0;
      pendingRadioMessage = null;
    }
  }

  if (activeRadioMessage) {
    radioTimer -= dt;
    if (radioTimer <= 0) {
      activeRadioMessage = null;
    }
  }
}

function drawRadioHUD(ctx, Game) {
  if (!activeRadioMessage || Game.state !== 'play') return;

  const text = `[РАЦИЯ]: ${activeRadioMessage}`;

  let alpha = 1;
  if (radioTimer < 0.5) alpha = radioTimer / 0.5;
  if (radioTimer > 3.5) alpha = (4.0 - radioTimer) / 0.5;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  const w = Game.viewW;
  const h = Game.viewH;

  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';

  // Background box
  const textWidth = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(26,26,26,0.85)';
  ctx.fillRect(w/2 - textWidth/2 - 20, h - 100, textWidth + 40, 32);
  ctx.strokeStyle = 'var(--ind)';
  ctx.lineWidth = 2;
  ctx.strokeRect(w/2 - textWidth/2 - 20, h - 100, textWidth + 40, 32);

  ctx.fillStyle = '#fff';
  ctx.fillText(text, w/2, h - 78);

  ctx.restore();
}
