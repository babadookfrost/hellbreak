
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  if (typeof Game !== 'undefined') {
    const baseW = 1280;
    const zoom = window.SettingsManager ? window.SettingsManager.zoom : 1.0;
    Game.scale = (canvas.width / baseW) * zoom;
    Game.viewW = canvas.width / Game.scale;
    Game.viewH = canvas.height / Game.scale;
    Game.effViewW = canvas.width;
    Game.effViewH = canvas.height;
  }
}

const TILE=80,MAP_W=48,MAP_H=48,BLOCK=6,MAP_PX_W=MAP_W*TILE,MAP_PX_H=MAP_H*TILE;

function compact(arr,dk){let w=0;for(let i=0;i<arr.length;i++)if(!arr[i][dk])arr[w++]=arr[i];arr.length=w;}
function compactByLife(arr){let w=0;for(let i=0;i<arr.length;i++)if(arr[i].life>0)arr[w++]=arr[i];arr.length=w;}
const CELL=96;
function buildGrid(ents){const g=new Map();for(let i=0;i<ents.length;i++){const e=ents[i];const k=(Math.floor(e.x/CELL))+','+(Math.floor(e.y/CELL));let b=g.get(k);if(!b){b=[];g.set(k,b);}b.push(e);}return g;}
function forNearby(g,x,y,cb){const cx=Math.floor(x/CELL),cy=Math.floor(y/CELL);for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){const b=g.get((cx+ox)+','+(cy+oy));if(b)for(let i=0;i<b.length;i++)cb(b[i]);}}
const clamp=(v,a,b)=>Math.max(a,Math.min(v,b));
function easeOutBack(x){const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);}

function generateMap(){
  const grid=new Uint8Array(MAP_W*MAP_H);
  const idx=(x,y)=>y*MAP_W+x;
  for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++){const edge=x===0||y===0||x===MAP_W-1||y===MAP_H-1;grid[idx(x,y)]=edge?1:0;}
  const bx=Math.ceil(MAP_W/BLOCK),by=Math.ceil(MAP_H/BLOCK);
  for(let byi=0;byi<by;byi++)for(let bxi=0;bxi<bx;bxi++){
    if(GameRNG.random()>0.55)continue;
    const pat=GameRNG.random();
    const y0=byi*BLOCK+2,y1=Math.min(byi*BLOCK+BLOCK,MAP_H-1);
    const x0=bxi*BLOCK+2,x1=Math.min(bxi*BLOCK+BLOCK,MAP_W-1);
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){let wall=pat<0.4?GameRNG.random()<0.7:(pat<0.7?(x+y)%2===0:GameRNG.random()<0.35);if(wall)grid[idx(x,y)]=1;}
  }
  const cx=Math.floor(MAP_W/2),cy=Math.floor(MAP_H/2);
  for(let y=cy-3;y<=cy+3;y++)for(let x=cx-3;x<=cx+3;x++)if(x>0&&y>0&&x<MAP_W-1&&y<MAP_H-1)grid[idx(x,y)]=0;
  return{grid,idx,pxW:MAP_PX_W,pxH:MAP_PX_H,spawnWorld:{x:(cx+0.5)*TILE,y:(cy+0.5)*TILE}};
}
function isWallTile(map,tx,ty){if(tx<0||ty<0||tx>=MAP_W||ty>=MAP_H)return true;return map.grid[map.idx(tx,ty)]===1;}
function isWallWorld(map,x,y){return isWallTile(map,Math.floor(x/TILE),Math.floor(y/TILE));}
function circleBlocked(map,x,y,r){return isWallWorld(map,x-r,y)||isWallWorld(map,x+r,y)||isWallWorld(map,x,y-r)||isWallWorld(map,x,y+r);}
function moveWithCollision(map,e,dx,dy){
  if(dx!==0){const nx=clamp(e.x+dx,TILE*0.6,MAP_PX_W-TILE*0.6);if(!circleBlocked(map,nx,e.y,e.r))e.x=nx;}
  if(dy!==0){const ny=clamp(e.y+dy,TILE*0.6,MAP_PX_H-TILE*0.6);if(!circleBlocked(map,e.x,ny,e.r))e.y=ny;}
}
function raycastClear(map,x0,y0,x1,y1){const steps=Math.ceil(Math.hypot(x1-x0,y1-y0)/(TILE*0.5));for(let i=1;i<steps;i++){const t=i/steps;if(isWallWorld(map,x0+(x1-x0)*t,y0+(y1-y0)*t))return false;}return true;}
function randomFloorTileFar(map,fx,fy,md){for(let a=0;a<60;a++){const tx=1+Math.floor(GameRNG.random()*(MAP_W-2)),ty=1+Math.floor(GameRNG.random()*(MAP_H-2));if(isWallTile(map,tx,ty))continue;const wx=(tx+0.5)*TILE,wy=(ty+0.5)*TILE;if(Math.hypot(wx-fx,wy-fy)>=md)return{x:wx,y:wy};}return{x:clamp(fx+md,TILE,MAP_PX_W-TILE),y:fy};}

class Camera{constructor(){this.x=0;this.y=0;}follow(t,vw,vh,dt){const tx=clamp(t.x-vw/2,0,Math.max(0,MAP_PX_W-vw));const ty=clamp(t.y-vh/2,0,Math.max(0,MAP_PX_H-vh));const e=Math.min(1,dt*8);this.x+=(tx-this.x)*e;this.y+=(ty-this.y)*e;}}

function burst(Game,x,y,count,color,speed,gravity){
  if(window.SettingsManager && SettingsManager.gfx === 'low') count = Math.ceil(count/2);
  for(let i=0;i<count;i++){const a=GameRNG.random()*Math.PI*2;const sp=(0.3+GameRNG.random()*0.7)*speed;Game.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.5+GameRNG.random()*0.4,color,size:2+GameRNG.random()*5,gravity:gravity||0});}
}
function muzzleFlash(Game,x,y,ang){
  const g = !(window.SettingsManager && SettingsManager.gfx === 'low');
  Game.particles.push({x:x+Math.cos(ang)*20,y:y+Math.sin(ang)*20,vx:Math.cos(ang)*60,vy:Math.sin(ang)*60,life:0.15,color:'#fff',size:14,glow:g});Game.particles.push({x:x+Math.cos(ang)*16,y:y+Math.sin(ang)*16,vx:Math.cos(ang)*30,vy:Math.sin(ang)*30,life:0.1,color:'#e8a317',size:8,glow:g});
}
function screenFlash(Game,intensity){Game.flash=Math.max(Game.flash||0,intensity);}
function screenShake(Game,amount){Game.shake=Math.max(Game.shake||0,amount);}
function spawnBanner(Game,opts){Game.banners.push({title:opts.title,subtitle:opts.subtitle,color:opts.color||'#e8a317',t:0,duration:2.0});}
function spawnFloatingText(Game,x,y,text,color){Game.floatTexts.push({x,y,text,color,life:1.0,vy:-60+GameRNG.random()*-40,vx:(GameRNG.random()-0.5)*30,t:0});}
function spawnImpact(Game,x,y,color,size){Game.impacts.push({x,y,r:size||20,color:color||'#fff',life:0.12,t:0});burst(Game,x,y,8,color||'#fff',150,200);}

const EPIC_SHOUTS = [
    "ЖАЛКИЙ СМЕРТНЫЙ...",
    "ПРЕВОСХОДНО...",
    "БОЛЬШЕ КРОВИ...",
    "И ЭТО ВСЕ?",
    "ТВОЯ ДУША ПРИНАДЛЕЖИТ МНЕ...",
    "НИКТО НЕ УЙДЕТ..."
];

function spawnEpicShout(Game) {
    const text = EPIC_SHOUTS[Math.floor(GameRNG.random() * EPIC_SHOUTS.length)];
    Game.shouts.push({text, t:0, duration:2.5});
}

loadMeta();

Input.wantWalk = false;

let audioCtx = null;
let audioInitialized = false;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  audioInitialized = true;
}

function createPlayer(spawn){
  return{
    x:spawn.x,y:spawn.y,r:14,speed:280,
    weaponId:'pistol',ammo:WEAPONS.pistol.ammoMax,reloading:0,cd:0,
    dashCd:0,dashT:0,dashDX:0,dashDY:0,dashUnlocked:false,invuln:0,
    hp:50,maxHp:50 // 30 HP по умолчанию
  };
}

function applyLevelStart(Game, isContinuation = false){
  const cfg=getLevelConfig(Game.level, Game.wave || 1);
  Game.levelCfg=cfg;
  if (!isContinuation) { Game.wave=1; Game.globalPower=1; }
  Game.bossSpawnedThisWave=false;Game.spawnT=0.5;Game.scaleT=5;Game.boss=null;Game.portal=null;Game.portalTimer=0;
  Game.floorIndex = Game.level;
  applyFloorPalette(Game.floorIndex);


  if (!isContinuation) {
    Game.player.weaponId=cfg.weaponOrder[0];const w=WEAPONS[Game.player.weaponId];Game.player.ammo=Math.max(1, w.ammoMax + Game.stats.ammoAdd);Game.player.reloading=0;
  }

  if (typeof checkContractsOnFloorStart === 'function') checkContractsOnFloorStart(Game.level);
  if (typeof queueRadioMessage === 'function') queueRadioMessage(Game.level % 4);
  if (typeof checkContractsOnWaveStart === 'function') checkContractsOnWaveStart(Game.wave);

}

function maybeUnlockDash(Game){
  if(Game.player.dashUnlocked||Game.wave<5)return;
  Game.player.dashUnlocked=true;
  const btnDash = document.getElementById('btn-dash');
  if(btnDash){
    btnDash.style.opacity = '1';
    btnDash.style.pointerEvents = 'auto';
    btnDash.style.borderColor = 'var(--cyan)';
  }
  spawnBanner(Game,{title:'НОВЫЙ НАВЫК',subtitle:'РЫВОК: SHIFT / КНОПКА',color:'#0ea5c7'});screenFlash(Game,0.5);burst(Game,Game.player.x,Game.player.y,35,'#0ea5c7',350);
}

function tryDash(Game,dx,dy){
  const p=Game.player;if(!p.dashUnlocked||p.dashCd>0)return;if(!dx&&!dy)return;
  const mag=Math.hypot(dx,dy);p.dashDX=dx/mag;p.dashDY=dy/mag;p.dashT=0.16;p.dashCd=2.6 * Game.stats.dashCdMul;p.invuln=0.24;
  burst(Game,p.x,p.y,16,'#0ea5c7',250);screenShake(Game,3);
  if (typeof updateContractsDash === 'function') updateContractsDash();
}
function updatePlayerMove(Game,dt,mx,my){
  const p=Game.player;
  const oldX = p.x, oldY = p.y;
  p.dashCd=Math.max(0,p.dashCd-dt);p.invuln=Math.max(0,p.invuln-dt);
  let moving=false;
  if(p.dashT>0){p.dashT-=dt;moveWithCollision(Game.map,p,p.dashDX*900*dt,p.dashDY*900*dt);moving=true;}
  else if(mx||my){const mag=Math.hypot(mx,my);const walkMul = Input.wantWalk ? 0.5 : 1.0; moveWithCollision(Game.map,p,(mx/mag)*p.speed*walkMul*Game.stats.speedMul*dt,(my/mag)*p.speed*walkMul*Game.stats.speedMul*dt);moving=true;}
  if(dt > 0) { p.vx = (p.x - oldX) / dt; p.vy = (p.y - oldY) / dt; } else { p.vx = 0; p.vy = 0; }
  return moving;
}

function updateBullets(Game,sdt){
  const bullets=Game.bullets,targets=Game.boss?Game.enemies.concat([Game.boss]):Game.enemies;const tgrid=buildGrid(targets);
  for(let i=0;i<bullets.length;i++){
    const b=bullets[i];
    b.x+=b.vx*sdt;
    b.y+=b.vy*sdt;

    if(b.trail){
      b.trail.push({x:b.x,y:b.y});
      if(b.trail.length>8) b.trail.shift();
    }

    if(isWallWorld(Game.map,b.x,b.y)){
      b.dead=true;
      if(b.splash){
        for(let j=0;j<targets.length;j++){
          const e=targets[j];
          if(e.dead)continue;
          if(Math.hypot(b.x-e.x,b.y-e.y)<b.splash){
            e.hp-=b.dmg;
            e.flash=1;
            if(e.hp<=0) killEnemy(Game,e);
          }
        }
        burst(Game,b.x,b.y,20,'#d97706',220,300);
        spawnImpact(Game,b.x,b.y,'#d97706',30);
        screenShake(Game,5);
      }else{
        burst(Game,b.x,b.y,5,'#888',80);
        spawnImpact(Game,b.x,b.y,'#1a1a1a',12);
      }
      continue;
    }

    if(b.x<0||b.y<0||b.x>Game.map.pxW||b.y>Game.map.pxH){
      b.dead=true;
    }

    if (b.dead && b.isInferno) {
      if (!Game.zones) Game.zones = [];
      Game.zones.push({x: b.x, y: b.y, r: 40, dmg: 5, life: 3.0, lastTick: 0});
    }

    if (b.dead) continue;

    if(b.friendly){
      forNearby(tgrid,b.x,b.y,e=>{
        if(e.dead||b.dead)return;
        const rr=b.r+e.r;
        if(Math.hypot(b.x-e.x,b.y-e.y)<rr){
          // Check boss invulnerability
          if (e.isBoss && e.state === 'invulnerable') {
              spawnImpact(Game,b.x,b.y,'#0ea5c7',10);
              b.pierce--;
              if(b.pierce<=0)b.dead=true;
              spawnFloatingText(Game,e.x,e.y-30,'БЛОК','#0ea5c7');
              return;
          }

          const isCrit = GameRNG.random() < 0.15;
          const dmgDealt = isCrit ? b.dmg * 2 : b.dmg;
          e.hp-=dmgDealt;
          e.flash=1;
          playSoundHit(isCrit);
          if (isCrit) burst(Game, e.x, e.y, 30, '#e8a317', 400);
          spawnFloatingText(Game,e.x,e.y-20,(Math.round(dmgDealt*10)/10).toString(),isCrit?'#e8a317':'#fff');
          spawnImpact(Game,b.x,b.y,b.color||'#1a1a1a',14);
          b.pierce--;
          if (b.isIce) e.iceSlow = 1.0;

          if (b.ricochet && !b.dead && b.pierce > 0) {
              // find new target
              let newTarget = null;
              let minDist = 150;
              forNearby(tgrid,b.x,b.y,nt=>{
                  if (nt===e || nt.dead) return;
                  const d = Math.hypot(nt.x-b.x, nt.y-b.y);
                  if (d < minDist) { minDist = d; newTarget = nt; }
              });
              if (newTarget) {
                  const ang = Math.atan2(newTarget.y - b.y, newTarget.x - b.x);
                  const speed = Math.hypot(b.vx, b.vy);
                  b.vx = Math.cos(ang) * speed;
                  b.vy = Math.sin(ang) * speed;
              } else {
                  b.dead = true;
              } // No target, stop ricochet to save performance
          } else {
              if(b.pierce<=0) b.dead=true;
          }
          if (b.isRailgun && b.dead) burst(Game, e.x, e.y, 40, '#0ea5c7', 500); // Railgun visual impact
          if(e.hp<=0) killEnemy(Game,e);
        }
      });

      if(b.splash&&b.dead){
        for(let j=0;j<targets.length;j++){
          const e=targets[j];
          if(e.dead) continue;
          if(Math.hypot(b.x-e.x,b.y-e.y)<b.splash){
            if (e.isBoss && e.state === 'invulnerable') {
                spawnFloatingText(Game,e.x,e.y-30,'БЛОК','#0ea5c7');
                continue;
            }

            const isCrit = GameRNG.random() < 0.15;
            const dmgDealt = isCrit ? b.dmg * 2 : b.dmg;
            e.hp-=dmgDealt;
            e.flash=1;
            playSoundHit(isCrit);
            if (isCrit) burst(Game, e.x, e.y, 30, '#e8a317', 400);
            spawnFloatingText(Game,e.x,e.y-20,(Math.round(dmgDealt*10)/10).toString(),isCrit?'#e8a317':'#fff');
            if (b.isIce) e.iceSlow = 1.0;
            if(e.hp<=0) killEnemy(Game,e);
          }
        }
        burst(Game,b.x,b.y,24,'#d97706',250,300);
        spawnImpact(Game,b.x,b.y,'#d97706',35);
        screenShake(Game,6);
      }
    }else{
      const p=Game.player, rr=b.r+p.r*0.5;
      if(p.invuln<=0 && Math.hypot(b.x-p.x,b.y-p.y)<rr){
        b.dead=true;
        const pdmg = 10 * Game.stats.dmgTakenMul;
        p.hp -= pdmg;
        p.invuln=1.2;
        if (typeof updateContractsDamageTaken === 'function') updateContractsDamageTaken();
        playSoundHit(false);
        spawnFloatingText(Game,p.x,p.y-20,'-'+Math.round(pdmg*10)/10,'#d92638');
        burst(Game,p.x,p.y,30,'#d92638',300);
        screenShake(Game,15);
        screenFlash(Game, 0.5);
        if(p.hp<=0) Game.die();
      }
    }
  }
}

const Game={
  state:'menu',viewW:window.innerWidth,viewH:window.innerHeight,effViewW:window.innerWidth,effViewH:window.innerHeight,
  map:null,camera:new Camera(),player:null,enemies:[],bullets:[],particles:[],banners:[],floatTexts:[],impacts:[],loot:[], inventory:[], stats:{}, slowWalking: false, shouts: [], zones: [],
  level:0,levelCfg:null,wave:1,kills:0,timeScale:0.05,shotSlowmo:0,spawnT:0,globalPower:1,scaleT:5,
  boss:null,flash:0,shake:0,leaderboard:loadLeaderboard(),pendingScore:null,


  recalcStats() {
    const s = { dmgMul: 1 + (metaState.dmgLvl * 0.05), pierceAdd: 0, dashCdMul: 1, speedMul: 1, slowTime: 0, reloadMul: 1, pickupMul: 1, ammoSave: 0, hpMul: 1 + (metaState.hpLvl * 0.1), ammoAdd: 0, dmgTakenMul: 1 };
    for (const item of this.inventory) {
      if(!item) continue;
      for (const affix of [item.pos, item.neg]) {
        if (affix.id === 'dmg') s.dmgMul += affix.val;
        if (affix.id === 'pierce') s.pierceAdd += affix.val;
        if (affix.id === 'dash_cd') s.dashCdMul += affix.val;
        if (affix.id === 'speed') s.speedMul += affix.val;
        if (affix.id === 'slow_time') s.slowTime = affix.val;
        if (affix.id === 'reload') s.reloadMul += affix.val;
        if (affix.id === 'pickup') s.pickupMul += affix.val;
        if (affix.id === 'ammo_save') s.ammoSave += affix.val;
        if (affix.id === 'hp_down') s.hpMul += affix.val;
        if (affix.id === 'speed_down') s.speedMul += affix.val;
        if (affix.id === 'ammo_down') s.ammoAdd += affix.val;
        if (affix.id === 'dmg_taken') s.dmgTakenMul += affix.val;
        if (affix.id === 'reload_up') s.reloadMul += affix.val;
        if (affix.id === 'dmg_down') s.dmgMul += affix.val;
      }
    }
    s.dmgMul = Math.max(0.1, s.dmgMul);
    s.speedMul = Math.max(0.1, s.speedMul);
    s.hpMul = Math.max(0.1, s.hpMul);
    s.dashCdMul = Math.max(0, s.dashCdMul);
    s.reloadMul = Math.max(0.1, s.reloadMul);

    if (this.player) {
      this.player.maxHp = Math.round(50 * s.hpMul);
      if (this.player.hp > this.player.maxHp) this.player.hp = this.player.maxHp;
    }
    return s;
  },
  die(){
    if(this.state==='death')return;
    if(this.state!=='play' && this.state!=='portal')return;
    this.state='death';
    document.getElementById('portal-ui').style.display = 'none';
    burst(this,this.player.x,this.player.y,50,'#d92638',600,200);
    screenFlash(this,1.0);screenShake(this,12);
    const score=this.kills*15+(this.level+1)*300+this.wave*25;

    if (this.isDaily) {
        DailyMode.saveScore(score, this.wave, this.level + 1);
        this.lastEarnedShards = 0;
        this.lastContractsBonus = 0;

        this.pendingScore = {score, kills: this.kills, wave: this.wave, level: this.level + 1};
        this.state = 'death';

        DailyMode.end();
        this.isDaily = false;
    } else {
        let earnedShards = Math.floor(this.kills * 0.5) + (this.wave * 2) + (this.level * 20);

        let contractsBonusRatio = 0;
        if (typeof activeContracts !== 'undefined' && activeContracts) {
          const completed = activeContracts.filter(c => c.status === 'completed').length;
          contractsBonusRatio = completed * 0.15;
        }

        if (this.isEvac) {
          earnedShards = Math.floor(earnedShards * 1.3); // +30% bonus for evacuation
        }

        if (contractsBonusRatio > 0) {
          earnedShards = Math.floor(earnedShards * (1 + contractsBonusRatio));
          this.lastContractsBonus = (contractsBonusRatio * 100).toFixed(0);
        } else {
          this.lastContractsBonus = 0;
        }

        metaState.shards += earnedShards;
        saveMeta();
        this.lastEarnedShards = earnedShards;

        if(qualifies(this.leaderboard,score)){
          this.pendingScore={score,kills:this.kills,wave:this.wave,level:this.level+1};
          this.state='enter-name';
          document.getElementById('name-entry').style.display='flex';
          const el=document.getElementById('name-input');el.value='';
          setTimeout(()=>el.focus(),50);
        }
    }
  },
    onBossDefeated(){
    screenFlash(this, 2.0);
    spawnEpicShout(this);
    this.portal = { x: this.player.x, y: this.player.y - 100 };
    this.portalTimer = 25; // 25 seconds soft timer
    this.portalNotified = false;
    spawnBanner(this, {title:'ПОРТАЛ ОТКРЫТ',subtitle:'ВЫБЕРИ СВОЙ ПУТЬ',color:'#0ea5c7'});
  },
  start(){
    initAudio();
    this.state='play';this.level=0;this.kills=0;this.isEvac=false;
    this.enemies=[];this.bullets=[];this.particles=[];this.banners=[];this.floatTexts=[];this.impacts=[];this.loot=[]; this.inventory=[];
    if (metaState.startItem > 0) this.inventory.push(generateLootItem('common'));
    this.stats=this.recalcStats();
    this.map=generateMap();this.player=createPlayer(this.map.spawnWorld); this.stats=this.recalcStats();
    this.player.hp = this.player.maxHp;
    applyLevelStart(this, false);
    this.camera.x=clamp(this.player.x-this.viewW/2,0,Math.max(0,this.map.pxW-this.viewW));
    this.camera.y=clamp(this.player.y-this.viewH/2,0,Math.max(0,this.map.pxH-this.viewH));
    Input.cmd=false;
  },
  update(dt){
    if (this.zones && this.zones.length > 0) {
      let aliveZones = [];
      const tgrid = buildGrid(this.boss ? this.enemies.concat([this.boss]) : this.enemies);
      for (let i = 0; i < this.zones.length; i++) {
        let z = this.zones[i];
        z.life -= dt;
        z.lastTick += dt;
        if (z.lastTick > 0.5) {
          z.lastTick = 0;
          forNearby(tgrid, z.x, z.y, e => {
            if (e.dead) return;
            if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r) {
              e.hp -= z.dmg; e.flash = 1;
              spawnFloatingText(this, e.x, e.y - 20, z.dmg.toString(), '#ff4400');
              if (e.hp <= 0) killEnemy(this, e);
            }
          });
        }
        if (z.life > 0) aliveZones.push(z);
      }
      this.zones = aliveZones;
    }

    if(this.state==='menu'){
      if(Input.clickUpgrades){
        document.getElementById('upgrades-menu').style.display='flex';
        renderUpgradesUI();
        Input.clickUpgrades = false;
      } else if (Input.wantDaily) {
        Input.wantDaily = false;
        DailyMode.start(this);
      } else if(Input.cmd){
        if (document.getElementById('upgrades-menu').style.display !== 'none') {
          document.getElementById('upgrades-menu').style.display = 'none';
        } else if (document.getElementById('contracts-menu').style.display !== 'none') {
          // ignore, wait for UI interaction
        } else {
          showContractsMenu();
        }
      }
      Input.cmd=false;
      return;
    }
    if(this.state==='loot-compare'){return;}
    if(this.state==='inventory'){
      if(Input.wantInventory || Input.keys['Escape']) {
        document.getElementById('inventory-menu').style.display = 'none';
        this.state = 'play';
        Input.wantInventory = false;
        Input.keys['Escape'] = false;
      }
      return;
    }
    if(this.state==='enter-name')return;
    if(this.state==='death'){
      if(Input.cmd) {
        if (typeof resetContractsState === 'function') resetContractsState();
        if (typeof showContractsMenu === 'function') {
          showContractsMenu();
        } else {
          this.start();
        }
      }
      Input.cmd=false;
      for(let i=0;i<this.particles.length;i++){const pt=this.particles[i];pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.life-=dt;if(pt.gravity)pt.vy+=pt.gravity*dt;}
      compactByLife(this.particles);return;
    }
    const p=this.player,{mvX,mvY}=getMoveVector();
    if(Input.wantDash){const ddx=Input.dashDirX||mvX,ddy=Input.dashDirY||mvY;tryDash(this,ddx,ddy);Input.wantDash=false;Input.dashDirX=0;Input.dashDirY=0;}
    if(this.hitstop > 0) {
      this.hitstop -= dt;
      this.camera.follow(p,this.viewW,this.viewH,dt);
      for(let i=0;i<this.particles.length;i++){const pt=this.particles[i];pt.x+=pt.vx*dt*0.1;pt.y+=pt.vy*dt*0.1;pt.life-=dt;}
      compactByLife(this.particles);
      this.shake=Math.max(0,this.shake-dt*15);
      return;
    }

    const moving=updatePlayerMove(this,dt,mvX,mvY);

    let isWalking = Input.wantWalk;
    if(moving) {
      if(isWalking) {
        this.timeScale = this.stats.slowTime ? this.stats.slowTime : 1.0;
      } else {
        this.timeScale = 1.0;
      }
    } else {
      this.timeScale = (this.shotSlowmo>0?0.3:0.03);
    }

    this.shotSlowmo=Math.max(0,this.shotSlowmo-dt);
    const sdt=dt*this.timeScale;
    this.camera.follow(p,this.viewW,this.viewH,dt);
    p.cd=Math.max(0,p.cd-dt);
    if(p.reloading>0){p.reloading-=dt;if(p.reloading<=0)p.ammo=WEAPONS[p.weaponId].ammoMax;}
    if(Input.wantReload){reloadWeapon(this);Input.wantReload=false;}
    if(Input.wantInventory){showInventoryMenu();Input.wantInventory=false;}
    const mw={x:Input.mouse.x+this.camera.x,y:Input.mouse.y+this.camera.y};
    if(Input.fireReq){fireWeapon(this,mw.x,mw.y);if(!WEAPONS[p.weaponId].auto)Input.fireReq=false;}
    this.scaleT-=dt;
    if(this.scaleT<=0){this.scaleT=5;this.globalPower=Math.min(4.5,this.globalPower*1.11);}
    maybeUnlockWeapon(this);maybeUnlockDash(this);
    if(!this.boss && !this.portal && this.wave % 5 === 0 && !this.bossSpawnedThisWave){
      this.bossSpawnedThisWave = true;
      spawnBoss(this);
      if (typeof checkContractsOnBossSpawn === 'function') checkContractsOnBossSpawn();
    }
    else if(!this.boss && !this.portal){
      this.spawnT-=sdt;
      const effectiveWave = Math.min(20, this.wave);
      const cap=Math.min(25,10+effectiveWave*2);
      if(this.spawnT<=0&&this.enemies.length<cap){this.spawnT=Math.max(0.8,1.8-effectiveWave*0.08-(this.globalPower-1)*0.1);spawnEnemy(this);}
    }
    updateEnemies(this,sdt);updateBullets(this,sdt);
    if (typeof updateContractsTimer === 'function') updateContractsTimer(dt);
    if (typeof updateRadio === 'function') updateRadio(dt);

    if (this.portal && (this.state === 'play' || this.state === 'portal')) {
      if (!this.portalNotified) {
        if (typeof checkContractsOnPortalSpawn === 'function') checkContractsOnPortalSpawn();
        this.portalNotified = true;
      }
      this.portalTimer -= dt; this.portalTriggerCd = Math.max(0, (this.portalTriggerCd || 0) - dt);
      if (this.portalTimer <= 0) {
        this.portal = null;
        spawnFloatingText(this, this.player.x, this.player.y - 40, 'ПОРТАЛ ЗАКРЫТ', '#888');
        if (this.state === 'portal') {
          this.state = 'play';
          document.getElementById('portal-ui').style.display = 'none';
        }
      } else {
        const distToPortal = Math.hypot(this.player.x - this.portal.x, this.player.y - this.portal.y);
        if (distToPortal < 50) {
          if ((this.portalTriggerCd || 0) <= 0) {
            this.state = 'portal';
            document.getElementById('portal-ui').style.display = 'flex';
            Input.cmd = false; Input.fireReq = false;
          }
        }
      }
    }




    // Подбор предметов
    if(this.loot) {
      let keptLoot = [];
      for(let i=0; i<this.loot.length; i++){
        let l = this.loot[i];
        if(Math.hypot(p.x - l.x, p.y - l.y) < (p.r + l.r + 15)*this.stats.pickupMul) {
          if(l.type === 'hp') {
            if(p.hp < p.maxHp) {
              p.hp+=10;
              spawnFloatingText(this, p.x, p.y-20, '+10 HP', '#10b981');
              burst(this, p.x, p.y, 15, '#10b981', 180);
            } else {
              this.kills += 15;
              spawnFloatingText(this, p.x, p.y-20, '+15 ОЧКОВ', '#e8a317');
            }
          } else if(l.type === 'item') {
            const maxSlots = 4 + metaState.extraSlot;
            if (this.inventory.length < maxSlots) {
              this.inventory.push(l.item);
              if (typeof checkContractsOnLootPicked === 'function') checkContractsOnLootPicked();
              this.stats = this.recalcStats();
              spawnBanner(this, {title: l.item.rarity.toUpperCase(), subtitle: l.item.pos.name + ' & ' + l.item.neg.name, color: l.item.color});
              burst(this, p.x, p.y, 30, l.item.color, 250);
              if (l.item.rarity === 'legendary' && GameRNG.random() < 0.3) {
                if (typeof queueRadioMessage === 'function') queueRadioMessage('legendary');
              }

              if (typeof tryEvolveWeapon === 'function') tryEvolveWeapon(this, l.item);
            } else {
              this.pendingLoot = l.item;
              this.state = 'loot-compare';
              document.getElementById('loot-compare').style.display = 'flex';
              updateLootCompareUI();
            }
          }
        } else {
          keptLoot.push(l);
        }
      }
      this.loot = keptLoot;
    }

    for(let i=0;i<this.particles.length;i++){const pt=this.particles[i];pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.life-=dt;if(pt.gravity)pt.vy+=pt.gravity*dt;}
    compact(this.enemies,'dead');compact(this.bullets,'dead');compactByLife(this.particles);
    if(this.boss&&this.boss.dead)this.boss=null;
    this.shake=Math.max(0,this.shake-dt*15);
  },
  draw(){
    ctx.clearRect(0,0,this.effViewW,this.effViewH);
    if(this.state==='menu'){drawMenu();return;}
    ctx.save();
    if(this.scale) ctx.scale(this.scale, this.scale);
    ctx.save();
    const sx=(GameRNG.random()-0.5)*this.shake*2,sy=(GameRNG.random()-0.5)*this.shake*2;
    ctx.translate(sx-Math.round(this.camera.x),sy-Math.round(this.camera.y));
    // Base view dimension for map draw
    const bW = this.viewW, bH = this.viewH;
    drawMap(this.camera,bW,bH);

    if (this.zones) {
      for (let i = 0; i < this.zones.length; i++) {
        let z = this.zones[i];
        ctx.fillStyle = 'rgba(255, 68, 0, 0.3)';
        ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI*2); ctx.fill();
      }
    }

    drawWorldEntities();
    ctx.restore();
    // draw HUD within logic scale, so text scales correctly to the logical dimensions
    drawHud();drawMinimap();
    if (typeof drawContractsHUD === 'function') drawContractsHUD(ctx, this);
    if (typeof drawRadioHUD === 'function') drawRadioHUD(ctx, this);
    ctx.restore(); // restores the original identity scale matrix
    this.flash=Math.max(0,(this.flash||0)-0.033*3);
    if(this.flash>0.01){
      ctx.fillStyle='rgba(255,255,255,'+(this.flash*0.6)+')';
      ctx.fillRect(0,0,this.viewW,this.viewH);
      if(this.flash>0.3){ctx.fillStyle='rgba(255,0,0,'+(this.flash*0.08)+')';ctx.fillRect(0,0,this.viewW*0.03,this.viewH);ctx.fillRect(this.viewW*0.97,0,this.viewW*0.03,this.viewH);}
    }
    updateAndDrawBanners(ctx,this,1/60,this.viewW,this.viewH);
    updateAndDrawFloatTexts(ctx,this,1/60);

    // Draw Shouts
    if (this.shouts && this.shouts.length > 0) {
        let aliveShouts = [];
        ctx.save();
        for (let i = 0; i < this.shouts.length; i++) {
            let shout = this.shouts[i];
            shout.t += 1/60;
            if (shout.t <= shout.duration) {
                aliveShouts.push(shout);
                let alpha = 1.0;
                if (shout.t < 0.3) alpha = shout.t / 0.3;
                else if (shout.duration - shout.t < 0.5) alpha = (shout.duration - shout.t) / 0.5;

                let scale = 1.0 + (shout.t / shout.duration) * 0.2;

                ctx.save();
                ctx.translate(this.viewW / 2, this.viewH / 4);
                ctx.scale(scale, scale);
                ctx.globalAlpha = alpha;

                ctx.font = "bold 40px monospace";
                ctx.fillStyle = "#d92638";
                ctx.strokeStyle = "#1a1a1a";
                ctx.lineWidth = 4;
                ctx.textAlign = "center";
                ctx.strokeText(shout.text, 0, 0);
                ctx.fillText(shout.text, 0, 0);

                ctx.restore();
            }
        }
        ctx.restore();
        this.shouts = aliveShouts;
    }
    updateAndDrawImpacts(ctx,this,1/60);
    if(this.state==='death')drawDeathScreen();
  },
  loop(t){
    const targetDt = window.SettingsManager && window.SettingsManager.fps ? 1000/window.SettingsManager.fps : 0;
    if (targetDt > 0 && t - (this.lastRender||0) < targetDt) { requestAnimationFrame(n=>this.loop(n)); return; }
    this.lastRender = t;

    const now=t/1000;
    const dt=Math.min(now-(this.last||now),0.1);
    this.last=now;
    this.update(dt);
    this.draw();
    requestAnimationFrame(n=>this.loop(n));
  },
  init(){
    resize();
    window.addEventListener('resize',resize);
    window.addEventListener('orientationchange',()=>setTimeout(resize,150));
    initInput(canvas);
    wireNameEntry();
    if (typeof initContractsUI === 'function') initContractsUI();
    requestAnimationFrame(t=>this.loop(t));
  }
};

function drawMap(cam,vw,vh){

  const floor = FLOORS[Game.floorIndex % FLOORS.length];
  const p = floor ? floor.palette : {};
  ctx.fillStyle=p.mapBg||'#e8e2d6';
  ctx.fillRect(cam.x-4,cam.y-4,vw+8,vh+8);

  const map=Game.map;
  const tx0=Math.max(0,Math.floor(cam.x/TILE)-1);
  const ty0=Math.max(0,Math.floor(cam.y/TILE)-1);
  const tx1=Math.min(MAP_W,Math.ceil((cam.x+vw)/TILE)+1);
  const ty1=Math.min(MAP_H,Math.ceil((cam.y+vh)/TILE)+1);
  for(let ty=ty0;ty<ty1;ty++){
    for(let tx=tx0;tx<tx1;tx++){
      const wall=map.grid[map.idx(tx,ty)]===1;
      const x=tx*TILE,y=ty*TILE;
      if(wall){
        ctx.fillStyle=(tx+ty)%2===0?(p.mapWall1||'#c4b8a8'):(p.mapWall2||'#b8aa98');
        ctx.fillRect(x,y,TILE,TILE);
        ctx.strokeStyle=p.mapStroke||'rgba(100,80,60,0.25)';ctx.strokeRect(x+1,y+1,TILE-2,TILE-2);
      }else{
        ctx.fillStyle=(tx+ty)%2===0?(p.mapFloor1||'#f0ebe0'):(p.mapFloor2||'#ebe5d8');
        ctx.fillRect(x,y,TILE,TILE);
      }
    }
  }
}

function drawWorldEntities(){

  // 1. Отрисовка выпавшего лута
  if(Game.loot) {
    for(let i=0; i<Game.loot.length; i++){
      let l = Game.loot[i];
      ctx.shadowBlur = 12;
      if(l.type === 'hp'){
        ctx.shadowColor = '#d92638';
        ctx.fillStyle = '#d92638';
        ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(l.x-2, l.y-l.r+2, 4, l.r*2-4);
        ctx.fillRect(l.x-l.r+2, l.y-2, l.r*2-4, 4);
      } else if(l.type === 'item') {
        l.t = (l.t || 0) + 1/60;
        ctx.shadowColor = l.item.color;
        ctx.shadowBlur = l.item.rarity === 'legendary' ? 15 + Math.sin(l.t*5)*5 : 10;
        ctx.fillStyle = l.item.color;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(l.item.icon, l.x, l.y + 6);
        ctx.strokeStyle = l.item.color;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(l.x, l.y, l.r + (l.item.rarity === 'legendary' ? Math.sin(l.t*10)*2 : 0), 0, Math.PI*2); ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }
  }

  // 2. Отрисовка частиц
  for(let i=0;i<Game.particles.length;i++){
    const pt=Game.particles[i];
    const a=Math.max(0,Math.min(1,pt.life*2.5));
    ctx.globalAlpha=a;
    if(pt.glow){ctx.shadowColor=pt.color;ctx.shadowBlur=12;}
    ctx.fillStyle=pt.color;
    ctx.beginPath();ctx.arc(pt.x,pt.y,pt.size||4,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;

  // 3. Отрисовка пуль
  for(let i=0;i<Game.bullets.length;i++){
    const b=Game.bullets[i];
    if(b.trail&&b.trail.length>1){
      for(let j=1;j<b.trail.length;j++){
        const t1=b.trail[j-1],t2=b.trail[j];
        ctx.strokeStyle=b.color||'#e8a317';
        // Make trails for evolved/railgun thicker
        let tWidth = b.r*(j/b.trail.length)*1.2;
        if (b.isRailgun) tWidth *= 2;
        ctx.lineWidth=tWidth;
        ctx.globalAlpha=0.6*(j/b.trail.length);
        ctx.beginPath();ctx.moveTo(t1.x,t1.y);ctx.lineTo(t2.x,t2.y);ctx.stroke();
      }
    }
    ctx.globalAlpha=1;
    ctx.shadowBlur=14;ctx.shadowColor=b.color||'#e8a317';
    ctx.fillStyle=b.color||'#e8a317';

    if (b.isRailgun) {
      const ang = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(ang);
      ctx.fillRect(-b.r*2, -b.r/2, b.r*4, b.r);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-b.r, -b.r/4, b.r*2, b.r/2);
      ctx.restore();
    } else {
      const isEvolved = b.r > 4 && b.friendly; // Basic heuristic
      if (isEvolved) {
        const ang = Math.atan2(b.vy, b.vx);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(ang);
        ctx.beginPath(); ctx.ellipse(0, 0, b.r*1.5, b.r*0.8, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.shadowBlur=0;
  }

  // 4. Отрисовка врагов
  const elist=Game.boss?Game.enemies.concat([Game.boss]):Game.enemies;
  for(let i=0;i<elist.length;i++){
    const e=elist[i];

    // Boss 2 telegraph
    if (e.isBoss && e.bossType === 'boss2' && e.state === 'telegraph' && e.dashTarget) {
        ctx.strokeStyle = 'rgba(217, 38, 56, 0.4)';
        ctx.lineWidth = e.r * 2;
        ctx.lineCap = 'round';
        ctx.setLineDash([10, 15]);
        ctx.beginPath(); ctx.moveTo(e.x, e.y);
        const dashDist = 800; // visual length
        const ang = Math.atan2(e.dashTarget.y - e.y, e.dashTarget.x - e.x);
        ctx.lineTo(e.x + Math.cos(ang) * dashDist, e.y + Math.sin(ang) * dashDist);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineCap = 'butt';
    }

    const bc=e.isHeart?'#ff0000':(e.bossType==='boss2'?'#0ea5c7':(e.isBoss?'#d92638':e.type==='shooter'?'#b829dd':e.type==='tank'?'#5a3a86':e.type==='kamikaze'?'#d97706':e.type==='sniper'?'#ff00ff':'#d92638'));

    if (e.isBoss && e.state === 'invulnerable') {
        ctx.shadowColor = '#0ea5c7'; ctx.shadowBlur = 30 + Math.sin(Date.now()/100)*15;
        ctx.strokeStyle = '#0ea5c7'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 15, 0, Math.PI*2); ctx.stroke();
        ctx.shadowBlur = 0;
    }

    const eRot = e.vx !== undefined ? Math.atan2(e.vy, e.vx) : (e.dashTarget ? Math.atan2(e.dashTarget.y - e.y, e.dashTarget.x - e.x) : 0);
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(eRot);

    if(e.flash>0){
      ctx.shadowColor='#fff';ctx.shadowBlur=20;
      ctx.fillStyle='rgba(255,255,255,'+(e.flash*0.8)+')';
      ctx.beginPath();ctx.arc(0,0,e.r*1.3,0,Math.PI*2);ctx.fill();
    }else{
      const ag=ctx.createRadialGradient(0,0,0,0,0,e.r*2);
      ag.addColorStop(0,bc+'44');ag.addColorStop(1,bc+'00');
      ctx.fillStyle=ag;ctx.beginPath();ctx.arc(0,0,e.isHeart ? e.r*(1.5+Math.sin(Date.now()/150)*0.2)*2 : e.r*2,0,Math.PI*2);ctx.fill();
    }
    ctx.shadowBlur=0;
    ctx.fillStyle=e.flash>0?'#fff':bc;
    ctx.strokeStyle=e.flash>0?'#fff':'#1a1a1a';ctx.lineWidth=e.isBoss?4:2;

    // Draw body shapes
    ctx.beginPath();
    if (e.bossType === 'boss2') {
        // Hexagon for boss2
        for(let j=0; j<6; j++) {
            ctx.lineTo(Math.cos(j*Math.PI/3)*e.r, Math.sin(j*Math.PI/3)*e.r);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Inner detail
        ctx.fillStyle='#1a1a1a';
        ctx.beginPath();
        for(let j=0; j<3; j++) {
            ctx.lineTo(Math.cos(j*2*Math.PI/3)*e.r*0.5, Math.sin(j*2*Math.PI/3)*e.r*0.5);
        }
        ctx.closePath(); ctx.fill();
    } else if (e.type === 'kamikaze') {
        // Triangle pointing forward
        ctx.moveTo(e.r, 0); ctx.lineTo(-e.r*0.5, e.r*0.8); ctx.lineTo(-e.r*0.5, -e.r*0.8);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#fff'; ctx.fillRect(-e.r*0.2, -4, e.r*0.5, 8); // eye
    } else if (e.type === 'tank') {
        // Square
        ctx.rect(-e.r, -e.r, e.r*2, e.r*2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle='#fff'; ctx.fillRect(e.r*0.2, -6, 8, 12); // eye
    } else if (e.isHeart) {
        ctx.arc(0,0,e.r,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.arc(0,0,e.r*0.3*(1+Math.sin(Date.now()/200)*0.5),0,Math.PI*2); ctx.fill();
    } else {
        ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();ctx.stroke();
        if(e.type==='shooter'||e.type==='sniper'){
            // Gun barrel + eye
            ctx.fillStyle=e.flash>0?'#fff':'#1a1a1a';
            ctx.fillRect(e.r*0.5, -4, e.r, 8);
            ctx.fillStyle='#fff';ctx.fillRect(e.r*0.2,-4,6,6);
        }
    }
    ctx.restore();
    if(e.maxHp>1){
      const w=Math.min(e.r*2.5,80);
      ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(e.x-w/2,e.y-e.r-14,w,6);
      ctx.fillStyle=e.isBoss?'#d92638':'#e8a317';
      ctx.fillRect(e.x-w/2,e.y-e.r-14,w*(e.hp/e.maxHp),6);
    }
  }


  if(Game.portal) {
    const px = Game.portal.x, py = Game.portal.y;
    const pt = Date.now() / 200;
    ctx.shadowBlur = 20 + Math.sin(pt)*10;
    ctx.shadowColor = '#0ea5c7';
    ctx.strokeStyle = '#0ea5c7';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(px, py, 40, 20 + Math.sin(pt)*5, 0, 0, Math.PI*2); ctx.stroke();

    ctx.fillStyle = 'rgba(14,165,199,0.3)';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw timer
    ctx.fillStyle = '#0ea5c7';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(Game.portalTimer) + 'С', px, py - 30);
  }


  // 5. Отрисовка игрока и полоски HP
  const p=Game.player;
  const pg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,100);
  pg.addColorStop(0,'rgba(232,163,23,0.18)');pg.addColorStop(1,'rgba(232,163,23,0)');
  ctx.fillStyle=pg;ctx.beginPath();ctx.arc(p.x,p.y,100,0,Math.PI*2);ctx.fill();
  if(p.dashT>0){ctx.shadowColor='#0ea5c7';ctx.shadowBlur=20;}
  else if(p.invuln>0){ctx.shadowColor='#0ea5c7';ctx.shadowBlur=12;}
  else{ctx.shadowColor='#e8a317';ctx.shadowBlur=8;}
  ctx.fillStyle=p.dashT>0?'#0ea5c7':p.invuln>0?'#0ea5c7':'#1a1a1a';

  const mw={x:Input.mouse.x+Game.camera.x,y:Input.mouse.y+Game.camera.y};
  const pRot = Math.atan2(mw.y - p.y, mw.x - p.x);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(pRot);

  // Body (Diamond / Polygon)
  ctx.beginPath();
  ctx.moveTo(p.r, 0); ctx.lineTo(0, p.r*0.8); ctx.lineTo(-p.r*0.8, 0); ctx.lineTo(0, -p.r*0.8);
  ctx.closePath();
  ctx.fill();

  // Eye / Visor
  ctx.fillStyle = '#fff';
  ctx.fillRect(p.r*0.2, -4, p.r*0.5, 8);

  // Hand/Gun stub
  ctx.fillStyle = '#444';
  ctx.fillRect(p.r*0.5, 4, p.r*0.8, 4);

  ctx.restore();
  ctx.shadowBlur=0;

  // Зеленая полоска HP над головой
  if(p && p.hp > 0){
    const w = 36;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(p.x - w/2, p.y - p.r - 14, w, 6);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(p.x - w/2, p.y - p.r - 14, w * (p.hp/p.maxHp), 6);
  }

  if(!isMobile){
    const mw={x:Input.mouse.x+Game.camera.x,y:Input.mouse.y+Game.camera.y};
    ctx.strokeStyle='rgba(232,163,23,0.3)';ctx.lineWidth=1.5;
    ctx.setLineDash([5,5]);
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(mw.x,mw.y);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(232,163,23,0.5)';
    ctx.beginPath();ctx.arc(mw.x,mw.y,4,0,Math.PI*2);ctx.fill();
  }
}

window.onload=()=>Game.init();
