const WEAPON_POOL=['pistol','shotgun','smg','lmg','bow','rocket'];
const WEAPONS={
  pistol:{id:'pistol',name:'Пистолет',icon:'◆',cd:0.28,pellets:3,spread:0.07,jitter:0.02,speed:1200,dmg:1,ammoMax:6,reload:1.3,pierce:1,auto:false},
  shotgun:{id:'shotgun',name:'Дробовик',icon:'▲',cd:0.8,pellets:8,spread:0.24,jitter:0.05,speed:900,dmg:1,ammoMax:2,reload:1.7,pierce:1,auto:false},
  smg:{id:'smg',name:'Автомат',icon:'■',cd:0.09,pellets:1,spread:0,jitter:0.08,speed:1300,dmg:1,ammoMax:30,reload:1.5,pierce:1,auto:true},
  lmg:{id:'lmg',name:'Пулемёт',icon:'●',cd:0.055,pellets:1,spread:0,jitter:0.11,speed:1300,dmg:1,ammoMax:80,reload:2.2,pierce:1,auto:true},
  bow:{id:'bow',name:'Лук',icon:'➤',cd:0.5,pellets:1,spread:0,jitter:0,speed:1000,dmg:4,ammoMax:5,reload:1.0,pierce:99,auto:false},
  rocket:{id:'rocket',name:'Гранатомёт',icon:'✹',cd:0.85,pellets:1,spread:0,jitter:0,speed:800,dmg:5,ammoMax:4,reload:2.0,pierce:1,auto:false,splash:140}
};
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
  const cfg=Game.levelCfg,idx=cfg.weaponWaves.indexOf(Game.wave);if(idx===-1)return;
  const wid=cfg.weaponOrder[idx];if(Game.player.weaponId===wid)return;
  Game.player.weaponId=wid;const w=WEAPONS[wid];Game.player.ammo=Math.max(1, w.ammoMax + Game.stats.ammoAdd);Game.player.reloading=0;
  spawnBanner(Game,{title:'НОВОЕ ОРУЖИЕ',subtitle:w.icon+'  '+w.name.toUpperCase(),color:'#e8a317'});
  screenFlash(Game,0.6);burst(Game,Game.player.x,Game.player.y,30,'#e8a317',300);
}

function fireWeapon(Game,ax,ay){
  const p=Game.player,w=WEAPONS[p.weaponId];if(p.cd>0||p.ammo<=0||p.reloading>0)return;
  p.cd=w.cd;if (Math.random() >= Game.stats.ammoSave) p.ammo--;Game.shotSlowmo=0.5;if(p.ammo===0)p.reloading=w.reload*Game.stats.reloadMul;
  const ang=Math.atan2(ay-p.y,ax-p.x);const mid=(w.pellets-1)/2;
  for(let i=0;i<w.pellets;i++){
    const a=ang+(i-mid)*w.spread+(Math.random()-0.5)*w.jitter;
    Game.bullets.push({x:p.x,y:p.y,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,r:w.splash?7:4,friendly:true,dmg:w.dmg*Game.stats.dmgMul,pierce:w.pierce+Game.stats.pierceAdd,splash:w.splash||0,dead:false,trail:[],color:w.id==='rocket'?'#d97706':w.id==='bow'?'#0ea5c7':'#e8a317'});
  }
  muzzleFlash(Game,p.x,p.y,ang);screenShake(Game,w.id==='rocket'?6:w.id==='shotgun'?4:2);
  playSoundShoot(w.id);
}

function reloadWeapon(Game){const p=Game.player,w=WEAPONS[p.weaponId];if(p.ammo<Math.max(1, w.ammoMax + Game.stats.ammoAdd)&&p.reloading<=0)p.reloading=w.reload*Game.stats.reloadMul;}