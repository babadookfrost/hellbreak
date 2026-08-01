import Phaser from 'phaser';
import { loadMeta, saveMeta, metaState, META_UPGRADES } from '../utils/Loot';
import { SettingsManager } from '../systems/SettingsManager';
import { ContractSystem } from '../systems/ContractSystem';
import { WEAPONS } from '../utils/Weapons';
import { GameScene } from './GameScene';

export class UIScene extends Phaser.Scene {
  private contractSystem!: ContractSystem;
  private selectedOperator: string = 'recruit';

  constructor() {
    super('UIScene');
  }

  create() {
    console.log('UIScene: Инициализация интерфейса.');

    // 1. Загрузка данных прогресса и настроек
    loadMeta();
    this.contractSystem = new ContractSystem();

    // 2. Инициализация HUD и Главного Меню в HTML
    this.initMainMenu();
    this.initOperatorSelect();
    this.initSettingsMenu();
    this.initUpgradesMenu();
    this.initContractsMenu();
    this.initPortalMenu();
    this.initInventoryMenu();
    this.initLootCompareMenu();

    // Обновляем отображение осколков на главном экране
    this.updateShardsDisplay();

    // Скрываем игровой HUD, так как мы в меню
    this.setHUDVisibility(false);
  }

  private setHUDVisibility(visible: boolean) {
    const touchUI = document.getElementById('touch-ui');
    const hints = document.querySelector('.desktop-hints') as HTMLElement;
    const inv = document.getElementById('hud-inventory');

    const display = visible ? 'block' : 'none';
    const flex = visible ? 'flex' : 'none';

    if (touchUI && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      touchUI.style.display = display;
    }
    if (hints) hints.style.display = display;
    if (inv) inv.style.display = flex;
  }

  private updateShardsDisplay() {
    const el = document.getElementById('menu-shards-display');
    if (el) {
      el.innerText = `ОСКОЛКИ: ${metaState.shards}`;
    }
  }

  private initMainMenu() {
    const btnStart = document.getElementById('btn-menu-start');
    const btnDaily = document.getElementById('btn-menu-daily');
    const btnUpgrades = document.getElementById('btn-menu-upgrades');
    const btnSettings = document.getElementById('btn-menu-settings');

    if (btnStart) {
      btnStart.onclick = () => {
        document.getElementById('main-menu')!.style.display = 'none';
        document.getElementById('operator-select-menu')!.style.display = 'flex';
        this.renderOperatorsList();
      };
    }

    if (btnDaily) {
      btnDaily.onclick = () => {
        alert('Дейли-раны временно в разработке.');
      };
    }

    if (btnUpgrades) {
      btnUpgrades.onclick = () => {
        document.getElementById('upgrades-menu')!.style.display = 'flex';
        this.renderUpgradesList();
      };
    }

    if (btnSettings) {
      btnSettings.onclick = () => {
        document.getElementById('settings-menu')!.style.display = 'flex';
      };
    }
  }

  private initOperatorSelect() {
    const btnConfirm = document.getElementById('btn-op-start') as HTMLButtonElement;
    const btnCancel = document.getElementById('btn-op-close');

    if (btnConfirm) {
      btnConfirm.onclick = () => {
        document.getElementById('operator-select-menu')!.style.display = 'none';

        // Показываем меню контрактов перед стартом
        document.getElementById('contracts-menu')!.style.display = 'flex';
        this.contractSystem.generateProposal();
        this.renderContractsList();
      };
    }

    if (btnCancel) {
      btnCancel.onclick = () => {
        document.getElementById('operator-select-menu')!.style.display = 'none';
        document.getElementById('main-menu')!.style.display = 'flex';
      };
    }
  }

  private renderOperatorsList() {
    const container = document.getElementById('operators-list');
    if (!container) return;

    container.innerHTML = '';
    const operators = [
      {
        id: 'recruit',
        name: 'Рекрут',
        desc: 'Базовый оперативник без слабостей.',
        statsText: 'Нет бонусов и штрафов.',
        cost: 0,
        unlocked: true
      },
      {
        id: 'juggernaut',
        name: 'Джаггернаут',
        desc: 'Тяжелая броня позволяет выживать дольше.',
        statsText: '+20% макс. HP, -10% базового урона.',
        cost: 400,
        unlocked: metaState.unlockedOperators.includes('juggernaut')
      },
      {
        id: 'phantom',
        name: 'Призрак',
        desc: 'Хрупкий, но смертоносный ассасин.',
        statsText: '+20% урона, -15% макс. HP.',
        cost: 600,
        unlocked: metaState.unlockedOperators.includes('phantom')
      }
    ];

    operators.forEach((op) => {
      const el = document.createElement('div');
      el.className = `universal-card ${op.unlocked ? 'available' : 'unavailable'}`;
      if (this.selectedOperator === op.id) {
        el.style.borderColor = 'var(--ind)';
        el.style.background = '#f9f2e8';
      }

      el.innerHTML = `
        <div class="card-content">
          <div class="card-header">
            <span class="card-title">${op.name.toUpperCase()}</span>
            ${!op.unlocked ? `<span class="card-badge" style="background:var(--blood); color:#fff; padding: 2px 6px;">КУПИТЬ ЗА ${op.cost}</span>` : ''}
          </div>
          <div class="text-body">${op.desc}</div>
          <div class="text-body" style="font-weight:bold; color:var(--ind);">${op.statsText}</div>
        </div>
      `;

      el.onclick = () => {
        if (op.unlocked) {
          this.selectedOperator = op.id;
          this.renderOperatorsList();
        } else if (metaState.shards >= op.cost) {
          metaState.shards -= op.cost;
          metaState.unlockedOperators.push(op.id);
          saveMeta();
          this.updateShardsDisplay();
          this.selectedOperator = op.id;
          this.renderOperatorsList();
        } else {
          alert('Недостаточно осколков!');
        }
      };

      container.appendChild(el);
    });
  }

  private initSettingsMenu() {
    const btnClose = document.getElementById('btn-settings-close');
    const sliderZoom = document.getElementById('set-zoom') as HTMLInputElement;

    if (btnClose) {
      btnClose.onclick = () => {
        document.getElementById('settings-menu')!.style.display = 'none';
      };
    }

    if (sliderZoom) {
      sliderZoom.value = String(SettingsManager.zoom);
      sliderZoom.oninput = () => {
        SettingsManager.zoom = parseFloat(sliderZoom.value);
        SettingsManager.save();

        // Меняем масштаб камеры в игре
        const gameScene = this.scene.get('GameScene') as GameScene;
        if (gameScene && gameScene.cameras && gameScene.cameras.main) {
          gameScene.cameras.main.setZoom(SettingsManager.zoom);
        }
      };
    }
  }

  private initUpgradesMenu() {
    const btnClose = document.getElementById('btn-upgrades-close');
    if (btnClose) {
      btnClose.onclick = () => {
        document.getElementById('upgrades-menu')!.style.display = 'none';
      };
    }
  }

  private renderUpgradesList() {
    const container = document.getElementById('upgrades-list');
    if (!container) return;

    container.innerHTML = '';
    META_UPGRADES.forEach((up) => {
      // Вычисляем текущий уровень улучшения
      const currentLvl = (metaState as any)[`${up.id}Lvl`] || 0;
      const cost = up.maxLvl === 1
        ? up.baseCost
        : Math.round(up.baseCost * Math.pow(up.costMult, currentLvl));

      const isMax = currentLvl >= up.maxLvl;

      const el = document.createElement('div');
      el.className = `universal-card ${isMax ? 'owned' : metaState.shards >= cost ? 'available' : 'unavailable'}`;

      el.innerHTML = `
        <div class="card-content">
          <div class="card-header">
            <span class="card-title">${up.name.toUpperCase()}</span>
            <span class="card-badge">${isMax ? 'МАКС.' : `УР. ${currentLvl}/${up.maxLvl}`}</span>
          </div>
          <div class="text-body">${up.desc}</div>
          ${!isMax ? `<div class="text-body" style="font-weight:bold; color:var(--ind);">СТОИМОСТЬ: ${cost} осколков</div>` : ''}
        </div>
      `;

      if (!isMax) {
        el.onclick = () => {
          if (metaState.shards >= cost) {
            metaState.shards -= cost;
            (metaState as any)[`${up.id}Lvl`] = currentLvl + 1;
            saveMeta();
            this.updateShardsDisplay();
            this.renderUpgradesList();
          } else {
            alert('Недостаточно осколков!');
          }
        };
      }

      container.appendChild(el);
    });
  }

  private initContractsMenu() {
    const btnStart = document.getElementById('btn-contracts-start');
    const btnCancel = document.getElementById('btn-contracts-cancel');

    if (btnStart) {
      btnStart.onclick = () => {
        document.getElementById('contracts-menu')!.style.display = 'none';
        this.contractSystem.activateSelected();

        // Начинаем забег в Phaser GameScene!
        this.startGameRun();
      };
    }

    if (btnCancel) {
      btnCancel.onclick = () => {
        document.getElementById('contracts-menu')!.style.display = 'none';
        document.getElementById('operator-select-menu')!.style.display = 'flex';
      };
    }
  }

  private renderContractsList() {
    const container = document.getElementById('contracts-list');
    if (!container) return;

    // Обновляем состояние кнопки старта
    const btnStart = document.getElementById('btn-contracts-start') as HTMLButtonElement;
    if (btnStart) {
      const selectedCount = this.contractSystem.selectedContractIds.size;
      btnStart.disabled = false; // Позволяем начать даже с 0 выбранными контрактами
      btnStart.innerText = `НАЧАТЬ (Выбрано ${selectedCount}/2)`;
    }

    container.innerHTML = '';
    this.contractSystem.proposedContracts.forEach((c) => {
      const isSelected = this.contractSystem.selectedContractIds.has(c.id);
      const el = document.createElement('div');
      el.className = `universal-card available`;
      if (isSelected) {
        el.style.borderColor = 'var(--ind)';
        el.style.background = '#f9f2e8';
      }

      el.innerHTML = `
        <div class="card-content">
          <div class="card-header">
            <span class="card-title">${c.name.toUpperCase()}</span>
            <span class="card-badge">${isSelected ? 'ВЫБРАН' : 'ДОСТУПЕН'}</span>
          </div>
          <div class="text-body">${c.desc}</div>
        </div>
      `;

      el.onclick = () => {
        if (isSelected) {
          this.contractSystem.selectedContractIds.delete(c.id);
        } else {
          // Максимум 2 контракта
          if (this.contractSystem.selectedContractIds.size >= 2) {
            alert('Можно выбрать максимум 2 испытания!');
            return;
          }
          this.contractSystem.selectedContractIds.add(c.id);
        }
        this.renderContractsList();
      };

      container.appendChild(el);
    });
  }

  private startGameRun() {
    // Включаем отображение игрового HUD
    this.setHUDVisibility(true);

    const gameScene = this.scene.get('GameScene') as GameScene;
    if (gameScene) {
      // Перезапускаем игровую сцену с нужным оператором
      gameScene.floorIndex = 0;
      gameScene.scene.restart();

      // Настраиваем подслушивание событий из GameScene для обновления HUD
      this.time.addEvent({
        delay: 50,
        loop: true,
        callback: () => {
          this.updateHUDValues(gameScene);
        }
      });
    }
  }

  private updateHUDValues(gameScene: GameScene) {
    if (!gameScene.player || !gameScene.player.active) return;
    this.renderHUDInventory(gameScene);
  }

  private renderHUDInventory(gameScene: GameScene) {
    const container = document.getElementById('hud-inventory');
    if (!container) return;

    // Отрисовываем текущие слоты артефактов
    container.innerHTML = `
      <div style="background: rgba(0,0,0,0.6); color: #fff; padding: var(--sp-sm) var(--sp-md); font-family: monospace; font-size: 14px; border-radius: 4px; display: flex; flex-direction: column; gap: 4px;">
        <div>ЖИЗНЬ: ${Math.round(gameScene.player.hp)} / ${gameScene.player.maxHp}</div>
        <div>ОРУЖИЕ: ${WEAPONS[gameScene.player.weaponId]?.name.toUpperCase()}</div>
        <div>ПАТРОНЫ: ${gameScene.player.reloading > 0 ? 'ПЕРЕЗАРЯДКА...' : `${gameScene.player.ammo} / ${WEAPONS[gameScene.player.weaponId]?.ammoMax}`}</div>
        <div>ВОЛНА: ${gameScene.waveManager.wave} (УБИТО: ${gameScene.waveManager.kills})</div>
      </div>
    `;
  }

  private initPortalMenu() {
    const btnDescend = document.getElementById('btn-portal-descend');
    const btnEvac = document.getElementById('btn-portal-evac');
    const btnCancel = document.getElementById('btn-portal-cancel');

    if (btnDescend) {
      btnDescend.onclick = () => {
        document.getElementById('portal-ui')!.style.display = 'none';

        // Спускаемся на следующий этаж
        const gameScene = this.scene.get('GameScene') as GameScene;
        gameScene.floorIndex++;
        gameScene.scene.restart();
      };
    }

    if (btnEvac) {
      btnEvac.onclick = () => {
        document.getElementById('portal-ui')!.style.display = 'none';

        // Эвакуация: начисляем заработанные осколки на базе
        const gameScene = this.scene.get('GameScene') as GameScene;
        const reward = Math.round(gameScene.waveManager.kills * 1.3);
        metaState.shards += reward;
        saveMeta();
        this.updateShardsDisplay();

        // Возвращаемся в главное меню
        this.setHUDVisibility(false);
        document.getElementById('main-menu')!.style.display = 'flex';
        gameScene.scene.stop();
      };
    }

    if (btnCancel) {
      btnCancel.onclick = () => {
        document.getElementById('portal-ui')!.style.display = 'none';
      };
    }
  }

  private initInventoryMenu() {
    const btnClose = document.getElementById('btn-inventory-close');
    if (btnClose) {
      btnClose.onclick = () => {
        document.getElementById('inventory-menu')!.style.display = 'none';
      };
    }
  }

  private initLootCompareMenu() {
    const btnSkip = document.getElementById('btn-loot-skip');
    const btnReplace = document.getElementById('btn-loot-replace') as HTMLButtonElement;

    if (btnSkip) {
      btnSkip.onclick = () => {
        document.getElementById('loot-compare-menu')!.style.display = 'none';
      };
    }

    if (btnReplace) {
      btnReplace.onclick = () => {
        document.getElementById('loot-compare-menu')!.style.display = 'none';
      };
    }
  }
}
export default UIScene;
