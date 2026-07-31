const LOOT_RARITY = {
  common: { name: "ОБЫЧНЫЙ", color: "#999", weight: 60, scale: 1 },
  rare: {
    name: "РЕДКИЙ",
    color: "var(--cyan)",
    colorVal: "#0ea5c7",
    weight: 30,
    scale: 1.5,
  },
  epic: {
    name: "ЭПИЧЕСКИЙ",
    color: "var(--ind)",
    colorVal: "#e8a317",
    weight: 9,
    scale: 2,
  },
  legendary: {
    name: "ЛЕГЕНДАРНЫЙ",
    color: "var(--blood)",
    colorVal: "#d92638",
    weight: 1,
    scale: 3,
  },
};

const LOOT_ICONS = ["◆", "▲", "■", "●", "➤", "✹", "★", "✚", "⚡", "♦"];

const AFFIXES_POS = [
  { id: "dmg", name: "Урон", val: 0.2, text: "+X% Урон", isPerc: true },
  {
    id: "pierce",
    name: "Пронзание",
    val: 1,
    text: "+X Целей пробито",
    isInt: true,
  },
  {
    id: "dash_cd",
    name: "Рывок",
    val: -0.2,
    text: "-X% Перезарядка рывка",
    isPerc: true,
  },
  {
    id: "speed",
    name: "Скорость",
    val: 0.15,
    text: "+X% Скорость бега",
    isPerc: true,
  },
  {
    id: "slow_time",
    name: "Заморозка",
    val: 0.5,
    text: "Замедление времени",
    isUnique: true,
  },
  {
    id: "reload",
    name: "Перезарядка",
    val: -0.25,
    text: "-X% Время перезарядки",
    isPerc: true,
  },
  {
    id: "pickup",
    name: "Радиус",
    val: 0.25,
    text: "+X% Радиус лута",
    isPerc: true,
  },
  {
    id: "ammo_save",
    name: "Патроны",
    val: 0.1,
    text: "+X% Шанс б/п выстрела",
    isPerc: true,
  },
];

const AFFIXES_NEG = [
  {
    id: "hp_down",
    name: "Хрупкость",
    val: -0.1,
    text: "-X% Здоровье",
    isPerc: true,
  },
  {
    id: "speed_down",
    name: "Тяжесть",
    val: -0.1,
    text: "-X% Скорость бега",
    isPerc: true,
  },
  {
    id: "ammo_down",
    name: "Малоемкость",
    val: -1,
    text: "-X Патронов в магазине",
    isInt: true,
  },
  {
    id: "dmg_taken",
    name: "Уязвимость",
    val: 0.2,
    text: "+X% Урон по вам",
    isPerc: true,
  },
  {
    id: "reload_up",
    name: "Медлительность",
    val: 0.25,
    text: "+X% Время перезарядки",
    isPerc: true,
  },
  {
    id: "dmg_down",
    name: "Слабость",
    val: -0.05,
    text: "-X% Урон",
    isPerc: true,
  },
];
function generateLootItem(forcedRarity, floorIndex = 0) {
  let rarityId = forcedRarity;
  if (!rarityId) {
    let epicBonus = 0;
    let legBonus = 0;
    if (floorIndex > 0) {
      const floor = FLOORS[floorIndex % FLOORS.length];
      epicBonus = (floor.lootBonus || 0) * 100;
      legBonus = (floor.lootBonus || 0) * 50;
    }

    // adjust weights temporarily
    const tempRarity = JSON.parse(JSON.stringify(LOOT_RARITY));
    tempRarity.epic.weight += epicBonus;
    tempRarity.legendary.weight += legBonus;

    let totalWeight = 0;
    for (const key in tempRarity) totalWeight += tempRarity[key].weight;

    const r = GameRNG.random() * totalWeight;
    let sum = 0;
    for (const [id, data] of Object.entries(tempRarity)) {
      sum += data.weight;
      if (r <= sum) {
        rarityId = id;
        break;
      }
    }
    if (!rarityId) rarityId = "common";
  }

  const rarity = LOOT_RARITY[rarityId];
  const pos = AFFIXES_POS[Math.floor(GameRNG.random() * AFFIXES_POS.length)];
  let posVal = pos.val * rarity.scale;
  if (pos.isInt) posVal = Math.max(1, Math.round(posVal));
  if (pos.isUnique) posVal = pos.val;

  const neg = AFFIXES_NEG[Math.floor(GameRNG.random() * AFFIXES_NEG.length)];
  let negVal = neg.val * rarity.scale;
  if (neg.isInt) negVal = Math.round(negVal) || -1;

  const posText = pos.isUnique
    ? pos.text
    : pos.text.replace(
        "X",
        Math.abs(pos.isInt ? posVal : Math.round(posVal * 100)),
      );
  const negText = neg.text.replace(
    "X",
    Math.abs(neg.isInt ? negVal : Math.round(negVal * 100)),
  );

  return {
    name: rarity.name + " АРТЕФАКТ",
    icon: LOOT_ICONS[Math.floor(GameRNG.random() * LOOT_ICONS.length)],
    rarity: rarityId,
    color: rarity.colorVal,
    pos: {
      id: pos.id,
      val: posVal,
      name: pos.name,
      desc: posText,
      text: posText,
    },
    neg: {
      id: neg.id,
      val: negVal,
      name: neg.name,
      desc: negText,
      text: negText,
    },
  };
}

const META_KEY = "myasorubka_meta_v1";
let metaState = {
  shards: 0,
  hpLvl: 0,
  dmgLvl: 0,
  startItem: 0,
  extraSlot: 0,
  unlockedOperators: ["recruit"],
  lastOperator: "recruit",
};
function loadMeta() {
  try {
    const r = JSON.parse(localStorage.getItem(META_KEY));
    if (r) {
      metaState = { ...metaState, ...r };
      if (!metaState.unlockedOperators)
        metaState.unlockedOperators = ["recruit"];
      if (!metaState.lastOperator) metaState.lastOperator = "recruit";
    }
  } catch {}
}
function saveMeta() {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(metaState));
  } catch {}
}
const META_UPGRADES = [
  {
    id: "hp",
    name: "+10% Макс HP",
    maxLvl: 5,
    baseCost: 50,
    costMult: 1.5,
    desc: "Увеличивает стартовое здоровье.",
  },
  {
    id: "dmg",
    name: "+5% Урон",
    maxLvl: 5,
    baseCost: 100,
    costMult: 1.5,
    desc: "Увеличивает базовый урон.",
  },
  {
    id: "item",
    name: "Стартовый предмет",
    maxLvl: 1,
    baseCost: 300,
    costMult: 1,
    desc: "Даёт случайный предмет на старте.",
  },
  {
    id: "slot",
    name: "+1 Слот инвентаря",
    maxLvl: 1,
    baseCost: 500,
    costMult: 1,
    desc: "Увеличивает инвентарь до 5 слотов.",
  },
  // Операторы не покупаются через этот список, у них свое меню, либо мы можем добавить их сюда
];

// Динамически добавляем операторов, которые еще не разблокированы, в список покупок
function getAvailableUpgrades() {
  let upgs = [...META_UPGRADES];
  if (!metaState.unlockedOperators.includes("juggernaut")) {
    upgs.push({
      id: "juggernaut",
      name: "ОПЕРАТОР: Джаггернаут",
      maxLvl: 1,
      baseCost: OPERATORS.juggernaut.cost,
      costMult: 1,
      desc: OPERATORS.juggernaut.statsText,
    });
  }
  if (!metaState.unlockedOperators.includes("phantom")) {
    upgs.push({
      id: "phantom",
      name: "ОПЕРАТОР: Призрак",
      maxLvl: 1,
      baseCost: OPERATORS.phantom.cost,
      costMult: 1,
      desc: OPERATORS.phantom.statsText,
    });
  }
  return upgs;
}

function getUpgradeCost(id, lvl) {
  const allUpgs = getAvailableUpgrades();
  const upg = allUpgs.find((u) => u.id === id);
  if (lvl >= upg.maxLvl) return Infinity;
  return Math.floor(upg.baseCost * Math.pow(upg.costMult, lvl));
}

function renderUpgradesUI() {
  document.getElementById("upgrade-shards-count").innerText = metaState.shards;
  const list = document.getElementById("upgrades-list");
  list.innerHTML = "";

  const allUpgs = getAvailableUpgrades();
  allUpgs.forEach((u) => {
    let lvl = 0;
    if (u.id === "hp") lvl = metaState.hpLvl;
    if (u.id === "dmg") lvl = metaState.dmgLvl;
    if (u.id === "item") lvl = metaState.startItem;
    if (u.id === "slot") lvl = metaState.extraSlot;
    if (["juggernaut", "phantom"].includes(u.id))
      lvl = metaState.unlockedOperators.includes(u.id) ? 1 : 0;

    const cost = getUpgradeCost(u.id, lvl);
    const maxed = lvl >= u.maxLvl;
    const canAfford = metaState.shards >= cost && !maxed;

    const row = document.createElement("div");
    row.className =
      "universal-card " +
      (maxed ? "owned" : canAfford ? "available" : "unavailable");
    row.style.marginBottom = "var(--sp-sm)";

    row.innerHTML = `
      <div class="card-content">
        <div class="card-header">
          <div class="card-title">${u.name} <span class="text-small" style="color:#7a7a7a;">(${lvl}/${u.maxLvl})</span></div>
        </div>
        <div class="text-body">${u.desc}</div>
      </div>
      ${
        maxed
          ? `<div class="card-badge">МАКС</div>`
          : `
        <button class="card-action-btn ${canAfford ? "available" : "unavailable"}" ${canAfford ? "" : "disabled"}>
          ${cost} ОСК.
        </button>
      `
      }
    `;

    const btn = row.querySelector("button");
    if (btn && canAfford) {
      btn.onclick = () => {
        metaState.shards -= cost;
        if (u.id === "hp") metaState.hpLvl++;
        if (u.id === "dmg") metaState.dmgLvl++;
        if (u.id === "item") metaState.startItem++;
        if (u.id === "slot") metaState.extraSlot++;
        if (["juggernaut", "phantom"].includes(u.id)) {
          metaState.unlockedOperators.push(u.id);
        }
        saveMeta();
        renderUpgradesUI();
      };
    }

    list.appendChild(row);
  });
}
