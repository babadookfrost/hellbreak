const WEAPON_POOL=['fire_staff','ice_wand','cursed_blade','necro_crossbow','storm_staff','void_shard'];
const WEAPONS={
  fire_staff:{id:'fire_staff',name:'Посох Огня',icon:'🔥',color:'#ff4400',cd:0.28,pellets:3,spread:0.07,jitter:0.02,speed:1200,dmg:1,ammoMax:6,reload:1.3,pierce:1,auto:false},
  ice_wand:{id:'ice_wand',name:'Ледяной Жезл',icon:'❄️',color:'#00ccff',cd:0.8,pellets:8,spread:0.24,jitter:0.05,speed:900,dmg:1,ammoMax:2,reload:1.7,pierce:1,auto:false},
  cursed_blade:{id:'cursed_blade',name:'Проклятый Клинок',icon:'🗡️',color:'#8a2be2',cd:0.09,pellets:1,spread:0,jitter:0.08,speed:1300,dmg:1,ammoMax:30,reload:1.5,pierce:1,auto:true},
  necro_crossbow:{id:'necro_crossbow',name:'Арбалет Некроманта',icon:'🏹',color:'#00fa9a',cd:0.055,pellets:1,spread:0,jitter:0.11,speed:1300,dmg:1,ammoMax:80,reload:2.2,pierce:1,auto:true},
  storm_staff:{id:'storm_staff',name:'Посох Бури',icon:'⚡',color:'#ffff00',cd:0.5,pellets:1,spread:0,jitter:0,speed:1000,dmg:4,ammoMax:5,reload:1.0,pierce:99,auto:false},
  void_shard:{id:'void_shard',name:'Осколок Бездны',icon:'🔮',color:'#4b0082',cd:0.85,pellets:1,spread:0,jitter:0,speed:800,dmg:5,ammoMax:4,reload:2.0,pierce:1,auto:false,splash:140},

  // Эволюционировавшее оружие
  inferno:{id:'inferno',name:'Инферно',icon:'🌋',color:'#ff0000',cd:0.4,pellets:1,spread:0,jitter:0,speed:1400,dmg:6,ammoMax:4,reload:1.0,pierce:1,auto:false,splash:60, evolved:true},
  winter_wand:{id:'winter_wand',name:'Жезл Вечной Зимы',icon:'🥶',color:'#00ffff',cd:0.7,pellets:14,spread:0.18,jitter:0.03,speed:1000,dmg:2,ammoMax:3,reload:1.5,pierce:3,auto:false, evolved:true},
  minigun:{id:'minigun',name:'Проклятие Душ',icon:'🗡️+',color:'#ff00ff',cd:0.03,pellets:1,spread:0,jitter:0.15,speed:1500,dmg:1,ammoMax:120,reload:2.0,pierce:2,auto:true, ricochet:true, evolved:true},
  railgun:{id:'railgun',name:'Ярость Громовержца',icon:'⚡+',color:'#0ea5c7',cd:0.6,pellets:1,spread:0,jitter:0,speed:2500,dmg:10,ammoMax:3,reload:1.5,pierce:999,auto:false, evolved:true}
};

const EVOLUTIONS = {
    'fire_staff': { affix: 'dmg', target: 'inferno' },
    'ice_wand': { affix: 'speed', target: 'winter_wand' },
    'cursed_blade': { affix: 'ammo_save', target: 'minigun' },
    'storm_staff': { affix: 'pierce', target: 'railgun' },
    'necro_crossbow': { affix: 'reload_up', target: 'minigun' }
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

            if (typeof spawnEpicShout === 'function') spawnEpicShout(Game);
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
  if (weaponId === 'ice_wand') { osc.type = 'square'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.2); dur = 0.2; vol = 0.15; }
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
      color: w.color || '#e8a317',
      ricochet: w.ricochet || false,
      isRailgun: w.id === 'railgun',
      isInferno: p.weaponId === 'inferno',
      isIce: p.weaponId === 'winter_wand'
    });
  }
  muzzleFlash(Game,p.x,p.y,ang);screenShake(Game,w.splash?8:(w.id==='ice_wand'||w.id==='winter_wand'?5:2));
  playSoundShoot(w.id);
}

function reloadWeapon(Game){const p=Game.player,w=WEAPONS[p.weaponId];if(p.ammo<Math.max(1, w.ammoMax + Game.stats.ammoAdd)&&p.reloading<=0)p.reloading=w.reload*Game.stats.reloadMul;}