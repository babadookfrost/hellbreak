const WEAPON_POOL=['pistol','shotgun','smg','lmg','bow','rocket'];
const WEAPONS={
  pistol:{id:'pistol',name:'Пистолет',icon:'◆',cd:0.28,pellets:3,spread:0.07,jitter:0.02,speed:1200,dmg:1,ammoMax:6,reload:1.3,pierce:1,auto:false},
  shotgun:{id:'shotgun',name:'Дробовик',icon:'▲',cd:0.8,pellets:8,spread:0.24,jitter:0.05,speed:900,dmg:1,ammoMax:2,reload:1.7,pierce:1,auto:false},
  smg:{id:'smg',name:'Автомат',icon:'■',cd:0.09,pellets:1,spread:0,jitter:0.08,speed:1300,dmg:1,ammoMax:30,reload:1.5,pierce:1,auto:true},
  lmg:{id:'lmg',name:'Пулемёт',icon:'●',cd:0.055,pellets:1,spread:0,jitter:0.11,speed:1300,dmg:1,ammoMax:80,reload:2.2,pierce:1,auto:true},
  bow:{id:'bow',name:'Лук',icon:'➤',cd:0.5,pellets:1,spread:0,jitter:0,speed:1000,dmg:4,ammoMax:5,reload:1.0,pierce:99,auto:false},
  rocket:{id:'rocket',name:'Гранатомёт',icon:'✹',cd:0.85,pellets:1,spread:0,jitter:0,speed:800,dmg:5,ammoMax:4,reload:2.0,pierce:1,auto:false,splash:140},

  // Эволюционировавшее оружие
  handcannon:{id:'handcannon',name:'Хэндкэннон',icon:'◆+',cd:0.4,pellets:1,spread:0,jitter:0,speed:1400,dmg:6,ammoMax:4,reload:1.0,pierce:1,auto:false,splash:60, evolved:true},
  sweeper:{id:'sweeper',name:'Подметальщик',icon:'▲+',cd:0.7,pellets:14,spread:0.18,jitter:0.03,speed:1000,dmg:2,ammoMax:3,reload:1.5,pierce:3,auto:false, evolved:true},
  minigun:{id:'minigun',name:'Миниган',icon:'■+',cd:0.03,pellets:1,spread:0,jitter:0.15,speed:1500,dmg:1,ammoMax:120,reload:2.0,pierce:2,auto:true, ricochet:true, evolved:true},
  railgun:{id:'railgun',name:'Рейлган',icon:'➤+',cd:0.6,pellets:1,spread:0,jitter:0,speed:2500,dmg:10,ammoMax:3,reload:1.5,pierce:999,auto:false, evolved:true}
};

const EVOLUTIONS = {
    'pistol': { affix: 'dmg', target: 'handcannon' },
    'shotgun': { affix: 'speed', target: 'sweeper' },
    'smg': { affix: 'ammo_save', target: 'minigun' },
    'bow': { affix: 'pierce', target: 'railgun' },
    'lmg': { affix: 'reload_up', target: 'minigun' } // Optional extra mappings
};

function tryEvolveWeapon(Game, pickedItem) {
    const currentWeaponId = Game.player.weaponId;
    if (WEAPONS[currentWeaponId].evolved) return; // Already evolved

    const evoRules = EVOLUTIONS[currentWeaponId];
    if (evoRules) {
        // Check if the picked item has the required affix in either pos or neg
        if (pickedItem.pos.id === evoRules.affix || pickedItem.neg.id === evoRules.affix) {

            Game.player.weaponId = evoRules.target;
            const w = WEAPONS[evoRules.target];
            Game.player.ammo = Math.max(1, w.ammoMax + Game.stats.ammoAdd);
            Game.player.reloading = 0;

            spawnBanner(Game, {title: 'ЭВОЛЮЦИЯ ОРУЖИЯ', subtitle: w.icon + ' ' + w.name.toUpperCase(), color: '#e8a317'});
            screenFlash(Game, 0.8);
            burst(Game, Game.player.x, Game.player.y, 50, '#e8a317', 400);

            // Queue radio message if applicable
            if (typeof queueRadioMessage === 'function') queueRadioMessage('legendary');
        }
    }
}
let lastShootTime = 0;
function playSoundShoot(weaponId) {
  const now = Date.now();
  if (now - lastShootTime < 40) return;
  lastShootTime = now;
  if (!audioInitialized) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  let dur = 0.1, vol = 0.1;
  if (weaponId === 'shotgun') { osc.type = 'square'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2); dur = 0.2; vol = 0.15; }
  else if (weaponId === 'rocket') { osc.type = 'square'; osc.frequency.setValueAtTime(100, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.3); dur = 0.3; vol = 0.2; }
  else if (weaponId === 'bow') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, audioCtx.currentTime); osc.frequency.linearRampToValueAtTime(300, audioCtx.currentTime + 0.1); }
  else { osc.type = 'square'; osc.frequency.setValueAtTime(300, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1); }

  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);
  osc.start();
  osc.stop(audioCtx.currentTime + dur);
}

function maybeUnlockWeapon(Game){

  const floorWaves = Game.wave - (Game.floorIndex * 5);
  // floorWaves represents how many waves the player has survived on THIS floor.
  // It starts at 1, goes up to 5 (or more if they stay).
  // We only unlock weapons for floorWaves 1 to 5.
  if (floorWaves < 1 || floorWaves > 5) return;
  const cfg=Game.levelCfg,idx=cfg.weaponWaves.indexOf(floorWaves);
if(idx===-1)return;
  const wid=cfg.weaponOrder[idx];if(Game.player.weaponId===wid)return;
  Game.player.weaponId=wid;const w=WEAPONS[wid];Game.player.ammo=Math.max(1, w.ammoMax + Game.stats.ammoAdd);Game.player.reloading=0;
  spawnBanner(Game,{title:'НОВОЕ ОРУЖИЕ',subtitle:w.icon+'  '+w.name.toUpperCase(),color:'#e8a317'});
  screenFlash(Game,0.6);burst(Game,Game.player.x,Game.player.y,30,'#e8a317',300);
}

function fireWeapon(Game,ax,ay){
  const p=Game.player,w=WEAPONS[p.weaponId];if(p.cd>0||p.ammo<=0||p.reloading>0)return;
  p.cd=w.cd;if (GameRNG.random() >= Game.stats.ammoSave) p.ammo--;Game.shotSlowmo=0.5;if(p.ammo===0)p.reloading=w.reload*Game.stats.reloadMul;
  const ang=Math.atan2(ay-p.y,ax-p.x);const mid=(w.pellets-1)/2;
  for(let i=0;i<w.pellets;i++){
    const a=ang+(i-mid)*w.spread+(GameRNG.random()-0.5)*w.jitter;
    Game.bullets.push({
      x:p.x, y:p.y, vx:Math.cos(a)*w.speed, vy:Math.sin(a)*w.speed,
      r: w.splash ? 7 : (w.evolved ? 6 : 4),
      friendly:true,
      dmg:w.dmg*Game.stats.dmgMul,
      pierce:w.pierce+Game.stats.pierceAdd,
      splash:w.splash||0,
      dead:false, trail:[],
      color: w.id==='rocket'||w.id==='handcannon' ? '#d97706' : (w.id==='bow'||w.id==='railgun' ? '#0ea5c7' : (w.evolved ? '#ff00ff' : '#e8a317')),
      ricochet: w.ricochet || false,
      isRailgun: w.id === 'railgun'
    });
  }
  muzzleFlash(Game,p.x,p.y,ang);screenShake(Game,w.splash?8:(w.id==='shotgun'||w.id==='sweeper'?5:2));
  playSoundShoot(w.id);
}

function reloadWeapon(Game){const p=Game.player,w=WEAPONS[p.weaponId];if(p.ammo<Math.max(1, w.ammoMax + Game.stats.ammoAdd)&&p.reloading<=0)p.reloading=w.reload*Game.stats.reloadMul;}