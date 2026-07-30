let lootReplaceIndex = -1;

function updateLootCompareUI() {
  const slotsContainer = document.getElementById('loot-compare-slots');
  slotsContainer.innerHTML = '';
  lootReplaceIndex = -1;
  document.getElementById('btn-loot-replace').disabled = true;
  document.getElementById('loot-compare-current').style.borderColor = '#ccc';
  document.getElementById('lc-curr-icon').innerHTML = '?';
  document.getElementById('lc-curr-stats').innerHTML = '-';

  const newItem = Game.pendingLoot;
  document.getElementById('loot-compare-new').style.borderColor = newItem.color;
  document.getElementById('lc-new-icon').innerHTML = '<span style="color:'+newItem.color+'">' + newItem.icon + '</span><div style="font-size:12px; font-weight:bold; color:'+newItem.color+'">' + LOOT_RARITY[newItem.rarity].name + '</div>';
  document.getElementById('lc-new-stats').innerHTML = '<div style="color:#10b981">+' + newItem.pos.text + '</div><div style="color:#d92638">-' + newItem.neg.text + '</div>';

  for(let i=0; i<4; i++) {
    const item = Game.inventory[i];
    const slot = document.createElement('div');
    slot.style.cssText = 'flex:1; aspect-ratio:1; border:2px solid ' + item.color + '; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:24px; cursor:pointer; color:' + item.color + '; background:#fff;';
    slot.innerHTML = item.icon;

    slot.onclick = () => {
      lootReplaceIndex = i;
      Array.from(slotsContainer.children).forEach(c => c.style.background = '#fff');
      slot.style.background = '#f0f0f0';

      document.getElementById('loot-compare-current').style.borderColor = item.color;
      document.getElementById('lc-curr-icon').innerHTML = '<span style="color:'+item.color+'">' + item.icon + '</span><div style="font-size:12px; font-weight:bold; color:'+item.color+'">' + LOOT_RARITY[item.rarity].name + '</div>';
      document.getElementById('lc-curr-stats').innerHTML = '<div style="color:#10b981">+' + item.pos.text + '</div><div style="color:#d92638">-' + item.neg.text + '</div>';
      document.getElementById('btn-loot-replace').disabled = false;
    };
    slotsContainer.appendChild(slot);
  }
}

function showInventoryMenu() {
  if (Game.state !== 'play' && Game.state !== 'portal') return;

  Game.state = 'inventory';
  document.getElementById('inventory-menu').style.display = 'flex';

  const list = document.getElementById('inventory-list');
  list.innerHTML = '';

  if (Game.inventory.length === 0) {
    list.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">Инвентарь пуст</div>';
    return;
  }

  for (let i = 0; i < Game.inventory.length; i++) {
    const item = Game.inventory[i];
    if (!item) continue;

    const el = document.createElement('div');
    el.style.cssText = `border: 2px solid ${item.color}; border-radius: 6px; padding: 12px; display: flex; gap: 16px; align-items: center; background: #faf8f4;`;
    el.innerHTML = `
      <div style="font-size:32px; color:${item.color}; border: 1px solid ${item.color}; border-radius:4px; width:48px; height:48px; display:flex; align-items:center; justify-content:center;">${item.icon}</div>
      <div style="flex:1;">
        <div style="font-weight:bold; color:${item.color};">${LOOT_RARITY[item.rarity].name.toUpperCase()}</div>
        <div style="font-size:12px; color:#10b981;">+ ${item.pos.text}</div>
        <div style="font-size:12px; color:#d92638;">- ${item.neg.text}</div>
      </div>
    `;
    list.appendChild(el);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-op-close').onclick = () => {
    document.getElementById('operator-select-menu').style.display = 'none';
    Game.state = 'menu';
  };
  document.getElementById('btn-op-start').onclick = () => {
    document.getElementById('operator-select-menu').style.display = 'none';
    if (typeof showContractsMenu === 'function') {
      showContractsMenu();
    } else {
      Game.start();
    }
  };
  document.getElementById('btn-upgrades-close').onclick = () => {
    document.getElementById('upgrades-menu').style.display = 'none';
  };
  document.getElementById('btn-inventory-close').onclick = () => {
    document.getElementById('inventory-menu').style.display = 'none';
    Game.state = 'play';
  };
  document.getElementById('btn-settings-close').onclick = () => {
    document.getElementById('settings-menu').style.display = 'none';
  };

  if (window.SettingsManager) {
      document.getElementById('set-zoom').value = SettingsManager.zoom;
      document.getElementById('set-fps').value = SettingsManager.fps;
      document.getElementById('set-gfx').value = SettingsManager.gfx;

      document.getElementById('set-zoom').addEventListener('input', (e) => {
          SettingsManager.zoom = parseFloat(e.target.value);
          SettingsManager.save();
          if(typeof resize === 'function') resize();
      });
      document.getElementById('set-fps').addEventListener('change', (e) => {
          SettingsManager.fps = parseInt(e.target.value);
          SettingsManager.save();
      });
      document.getElementById('set-gfx').addEventListener('change', (e) => {
          SettingsManager.gfx = e.target.value;
          SettingsManager.save();
      });
  }

  document.getElementById('btn-loot-skip').onclick = () => {
    document.getElementById('loot-compare').style.display = 'none';
    Game.pendingLoot = null;
    Game.state = 'play';
  };
  document.getElementById('btn-loot-replace').onclick = () => {
    if (lootReplaceIndex >= 0 && lootReplaceIndex < 4) {
      Game.inventory[lootReplaceIndex] = Game.pendingLoot;
      Game.stats = Game.recalcStats();
      spawnBanner(Game, {title: 'ПРЕДМЕТ ЭКИПИРОВАН', subtitle: '', color: Game.pendingLoot.color});
      burst(Game, Game.player.x, Game.player.y, 30, Game.pendingLoot.color, 250);
      if (Game.pendingLoot.rarity === 'legendary' && GameRNG.random() < 0.3) {
        if (typeof queueRadioMessage === 'function') queueRadioMessage('legendary');
      }

      if (typeof tryEvolveWeapon === 'function') tryEvolveWeapon(Game, Game.pendingLoot);
    }
    document.getElementById('loot-compare').style.display = 'none';
    Game.pendingLoot = null;
    Game.state = 'play';
  };
});

function updateAndDrawBanners(ctx,Game,dt,W,H){
  if(!Game.banners.length)return;
  const b=Game.banners[0];b.t+=dt;const p=b.t/b.duration;if(p>=1){Game.banners.shift();return;}
  let scale=1,alpha=1;if(p<0.2)scale=4-3*easeOutBack(p/0.2);else if(p>0.75)alpha=1-(p-0.75)/0.25;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(W/2,H*0.28);ctx.scale(scale,scale);
  ctx.strokeStyle='rgba(0,0,0,'+(0.15*alpha)+')';ctx.lineWidth=2;
  for(let s=0;s<12;s++){const a=(s/12)*Math.PI*2+b.t*3;ctx.beginPath();ctx.moveTo(Math.cos(a)*90,Math.sin(a)*90);ctx.lineTo(Math.cos(a)*180,Math.sin(a)*180);ctx.stroke();}
  ctx.shadowColor=b.color;ctx.shadowBlur=20;ctx.textAlign='center';ctx.font='bold 56px monospace';ctx.lineWidth=8;ctx.strokeStyle='rgba(255,255,255,0.8)';ctx.strokeText(b.title,0,0);ctx.fillStyle=b.color;ctx.fillText(b.title,0,0);
  ctx.font='bold 30px monospace';ctx.strokeText(b.subtitle,0,48);ctx.fillStyle='#1a1a1a';ctx.fillText(b.subtitle,0,48);ctx.shadowBlur=0;ctx.restore();
}

function updateAndDrawFloatTexts(ctx,Game,dt){
  for(let i=0;i<Game.floatTexts.length;i++){
    const ft=Game.floatTexts[i];ft.t+=dt;ft.life-=dt;ft.x+=ft.vx*dt;ft.y+=ft.vy*dt;ft.vy+=80*dt;
    const a=Math.max(0,ft.life);ctx.globalAlpha=a;ctx.font=ft.color==='#e8a317'?'bold 26px monospace':'bold 22px monospace';ctx.textAlign='center';
    ctx.strokeStyle='rgba(26,26,26,'+(a*0.8)+')';ctx.lineWidth=4;ctx.strokeText(ft.text,ft.x,ft.y);ctx.fillStyle=ft.color;ctx.fillText(ft.text,ft.x,ft.y);
  }
  ctx.globalAlpha=1;let w=0;for(let i=0;i<Game.floatTexts.length;i++)if(Game.floatTexts[i].life>0)Game.floatTexts[w++]=Game.floatTexts[i];Game.floatTexts.length=w;
}

function updateAndDrawImpacts(ctx,Game,dt){
  for(let i=0;i<Game.impacts.length;i++){
    const im=Game.impacts[i];im.t+=dt;im.life-=dt;const p=im.t/(im.life+im.t);const r=im.r*(1+p*2);const a=Math.max(0,1-p);
    ctx.globalAlpha=a;ctx.strokeStyle=im.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(im.x,im.y,r,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=im.color;ctx.beginPath();ctx.arc(im.x,im.y,r*0.3,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;let w=0;for(let i=0;i<Game.impacts.length;i++)if(Game.impacts[i].life>0)Game.impacts[w++]=Game.impacts[i];Game.impacts.length=w;
}

const LB_KEY='myasorubka_leaderboard_v4';
function loadLeaderboard(){try{const r=JSON.parse(localStorage.getItem(LB_KEY));return Array.isArray(r)?r:[];}catch{return[];}}
function saveLeaderboard(l){try{localStorage.setItem(LB_KEY,JSON.stringify(l.slice(0,10)));}catch{}}
function qualifies(l,s){return l.length<10||s>l[l.length-1].score;}
function addEntry(l,e){const n=[...l,e].sort((a,b)=>b.score-a.score).slice(0,10);saveLeaderboard(n);return n;}

function spawnBannerLevelUp(Game,cfg){

  const floorName = cfg.name || ('УРОВЕНЬ ' + (Game.level + 1));
  const floor = FLOORS[Game.level % FLOORS.length];
  const subtitle = floor ? floor.subtitle : 'ВХОД';
  Game.banners.push({title:'ЭТАЖ ' + (Game.level + 1) + ' · ' + floorName, subtitle: subtitle, color: floor ? floor.palette['--cyan'] : '#0ea5c7', t:0, duration:3.0});

  screenFlash(Game,1.0);screenShake(Game,8);
  burst(Game,Game.player.x,Game.player.y,60,'#d97706',400);
}

function drawHud(){

  const hudContainer = document.getElementById('hud-inventory');
  if (Game.state === 'play' || Game.state === 'loot-compare' || Game.state === 'inventory') {
    let html = '';
    const maxSlots = 4 + metaState.extraSlot;
    for(let i=0; i<maxSlots; i++) {
      if(Game.inventory[i]) {
        const item = Game.inventory[i];
        const isLeg = item.rarity === 'legendary';
        const pulse = isLeg ? 'box-shadow: 0 0 10px '+item.color+'; animation: pulse 1s infinite alternate;' : '';
        html += '<div style="width:32px; height:32px; border:2px solid '+item.color+'; border-radius:4px; display:flex; align-items:center; justify-content:center; color:'+item.color+'; background:rgba(26,26,26,0.5); font-size:18px; text-shadow: 0 0 4px '+item.color+'; ' + pulse + '; pointer-events:auto; cursor:pointer;" onclick="if(typeof Input !== \'undefined\') Input.wantInventory=true;">' + item.icon + '</div>';
      } else {
        html += '<div style="width:32px; height:32px; border:1px solid rgba(26,26,26,0.3); border-radius:4px; background:rgba(0,0,0,0.1); pointer-events:auto; cursor:pointer;" onclick="if(typeof Input !== \'undefined\') Input.wantInventory=true;"></div>';
      }
    }
    if(hudContainer && hudContainer.innerHTML !== html) {
        hudContainer.innerHTML = html;
        hudContainer.style.pointerEvents = 'auto';
    }
  } else if(hudContainer) {
    hudContainer.innerHTML = '';
  }

  const p=Game.player;
  const fs=Math.max(11,Math.min(15,Game.viewW/32));
  ctx.shadowColor='rgba(255,255,255,0.5)';ctx.shadowBlur=4;
  ctx.fillStyle='#1a1a1a';ctx.font='bold '+fs+'px monospace';ctx.textAlign='left';
  ctx.fillText('УР:'+(Game.level+1)+' В:'+Game.wave+(Game.boss?' [БОСС]':'')+' КИЛЛ:'+Game.kills,12,28);

  if (Game.isDaily) {
      ctx.fillStyle='#0ea5c7';ctx.font='bold '+(fs-2)+'px monospace';
      ctx.fillText(`ДЕЙЛИ-РАН [${DailyMode.seed}]`, 12, 28 + fs + 4);
  }

  const w=WEAPONS[p.weaponId];
  let as=p.reloading>0?'РЕЛОАД...':'['+'●'.repeat(p.ammo)+'○'.repeat(Math.max(0,Math.max(1, w.ammoMax + Game.stats.ammoAdd)-p.ammo))+']';
  ctx.textAlign='right';ctx.fillStyle=p.reloading>0?'#888':'#1a1a1a';
  const minimapSize=Math.min(140,Game.viewW*0.2);
  ctx.fillText(w.icon+' '+as,Game.viewW-minimapSize-18,28);

  ctx.fillStyle=Game.timeScale<=0.1?'#888':'#e8a317';
  ctx.fillText(Game.timeScale<=0.1?'◆ СТОП':'▶ ХОД',Game.viewW-22,Game.viewH-48);

  if(p.dashUnlocked){
    ctx.fillStyle=p.dashCd>0?'#999':'#0ea5c7';
    ctx.fillText(p.dashCd>0?'РЫВОК '+p.dashCd.toFixed(1)+'с':'РЫВОК ГОТОВ',Game.viewW-22,Game.viewH-24);
  }
  ctx.shadowBlur=0;
  if(Game.boss){
    const bw=Math.min(520,Game.viewW-60);
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(Game.viewW/2-bw/2,48,bw,14);
    const grad=ctx.createLinearGradient(Game.viewW/2-bw/2,0,Game.viewW/2+bw/2,0);
    grad.addColorStop(0,'#d92638');grad.addColorStop(1,'#ff6b7d');
    ctx.fillStyle=grad;ctx.fillRect(Game.viewW/2-bw/2,48,bw*(Game.boss.hp/Game.boss.maxHp),14);
    ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1;ctx.strokeRect(Game.viewW/2-bw/2,48,bw,14);
    ctx.fillStyle='#1a1a1a';ctx.font='bold 12px monospace';ctx.textAlign='center';
    ctx.fillText('БОСС',Game.viewW/2,59);
  }
}

function drawMinimap(){
  const sz=Math.min(140,Game.viewW*0.2),pd=Math.min(14,Game.viewW*0.028);
  const ox=Game.viewW-sz-pd,oy=pd;
  ctx.fillStyle='rgba(240,235,224,0.85)';ctx.fillRect(ox,oy,sz,sz);
  ctx.strokeStyle='rgba(200,160,80,0.3)';ctx.lineWidth=1;ctx.strokeRect(ox,oy,sz,sz);
  const sx=sz/MAP_W,sy=sz/MAP_H;
  const map=Game.map;
  ctx.fillStyle='#c4b8a8';
  for(let ty=0;ty<MAP_H;ty+=2)for(let tx=0;tx<MAP_W;tx+=2)if(map.grid[map.idx(tx,ty)]===1)ctx.fillRect(ox+tx*sx,oy+ty*sy,sx*2,sy*2);
  const p=Game.player;
  ctx.fillStyle='#e8a317';ctx.shadowColor='#e8a317';ctx.shadowBlur=6;
  ctx.beginPath();ctx.arc(ox+(p.x/TILE)*sx,oy+(p.y/TILE)*sy,3,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle='#d92638';
  const elist=Game.boss?Game.enemies.concat([Game.boss]):Game.enemies;
  for(let i=0;i<elist.length;i++){const e=elist[i];ctx.beginPath();ctx.arc(ox+(e.x/TILE)*sx,oy+(e.y/TILE)*sy,e.isBoss?4:2,0,Math.PI*2);ctx.fill();}
}

function drawMenu(){
  ctx.save();
  if (Game.scale) ctx.scale(Game.scale, Game.scale);
  const g=ctx.createLinearGradient(0,0,0,Game.viewH);
  g.addColorStop(0,'#faf6f0');g.addColorStop(1,'#f5f0e8');
  ctx.fillStyle=g;ctx.fillRect(0,0,Game.viewW,Game.viewH);
  const ts=Math.min(85,Game.viewW/9);
  ctx.shadowColor='#d92638';ctx.shadowBlur=20;
  ctx.fillStyle=Game.isEvac ? '#0ea5c7' : '#d92638';ctx.shadowColor=Game.isEvac ? '#0ea5c7' : '#d92638';ctx.font='bold '+ts+'px monospace';ctx.textAlign='center';
  ctx.fillText('М Я С О Р У Б К А',Game.viewW/2,Game.viewH*0.3);
  ctx.shadowBlur=0;
  const ss=Math.max(13,Math.min(18,Game.viewW/38));
  ctx.fillStyle='#5a5a5a';ctx.font=ss+'px monospace';
  ctx.fillText('Двигайся — время идёт. Стой — время замирает.',Game.viewW/2,Game.viewH*0.3+ts*0.55);
  ctx.fillStyle='#e8a317';ctx.shadowColor='#e8a317';ctx.shadowBlur=8;
  ctx.fillText('КЛИК / ТАП / ENTER чтобы начать обычный забег',Game.viewW/2,Game.viewH*0.3+ts*0.95);
  ctx.shadowBlur=0;

  // Кнопка Дейли-рана (нажатие "D" или кнопка)
  const bestDaily = DailyMode.getBestScore();
  const dailyText = bestDaily > 0 ? `ДЕЙЛИ-РАН (СИД: ${getDailySeed()}) - ЛУЧШИЙ СЧЁТ: ${bestDaily}` : `ДЕЙЛИ-РАН (СИД: ${getDailySeed()})`;

  const dailyY = Game.viewH*0.3+ts*0.95 + 40;
  ctx.fillStyle='#0ea5c7';ctx.shadowColor='#0ea5c7';ctx.shadowBlur=8;
  ctx.fillText('НАЖМИ "D" или КЛИКНИ СЮДА чтобы начать ' + dailyText, Game.viewW/2, dailyY);

  // Добавим хитбокс для клика
  window.dailyBtnRect = {
    x: Game.viewW/2 - 300,
    y: dailyY - 20,
    w: 600,
    h: 40
  };

  ctx.shadowBlur=0;
  const list=Game.leaderboard;
  if(list.length){
    const sy=Game.viewH*0.3+ts*1.35;
    ctx.fillStyle='#1a1a1a';ctx.font='bold '+ss+'px monospace';
    ctx.fillText('ТАБЛИЦА ЛИДЕРОВ',Game.viewW/2,sy);
    ctx.font=(ss-2)+'px monospace';
    for(let i=0;i<Math.min(5,list.length);i++){
      const e=list[i];ctx.fillStyle=i===0?'#e8a317':'#7a7a7a';
      ctx.fillText((i+1)+'. '+e.name+' — '+e.score+' очк. (ур.'+e.level+', волна '+e.wave+')',Game.viewW/2,sy+28+i*(ss+4));
    }
  }

  // Draw Upgrades Button
  const uw = 200, uh = 40;
  const ux = Game.viewW/2 - uw/2, uy = Game.viewH*0.75 - uh/2;
  const hover = (Input.mouse.x >= ux && Input.mouse.x <= ux+uw && Input.mouse.y >= uy && Input.mouse.y <= uy+uh);
  ctx.fillStyle = hover ? '#e8a317' : 'rgba(232,163,23,0.2)';
  ctx.strokeStyle = '#e8a317';
  ctx.lineWidth = 2;
  ctx.fillRect(ux, uy, uw, uh);
  ctx.strokeRect(ux, uy, uw, uh);
  ctx.fillStyle = hover ? '#1a1a1a' : '#e8a317';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ПРОКАЧКА', Game.viewW/2, uy + 25);

  // Draw Settings Button
  const suw = 200, suh = 40;
  const sux = Game.viewW/2 - suw/2, suy = Game.viewH*0.75 + 50 - suh/2;
  const shover = (Input.mouse.x >= sux && Input.mouse.x <= sux+suw && Input.mouse.y >= suy && Input.mouse.y <= suy+suh);
  ctx.fillStyle = shover ? '#e8a317' : 'rgba(232,163,23,0.2)';
  ctx.strokeStyle = '#e8a317';
  ctx.lineWidth = 2;
  ctx.fillRect(sux, suy, suw, suh);
  ctx.strokeRect(sux, suy, suw, suh);
  ctx.fillStyle = shover ? '#1a1a1a' : '#e8a317';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('НАСТРОЙКИ', Game.viewW/2, suy + 25);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(`ОСКОЛКИ: ${metaState.shards}`, 10, 20);
  ctx.restore();
}

function drawDeathScreen(){
  ctx.fillStyle='rgba(245,240,232,0.85)';ctx.fillRect(0,0,Game.viewW,Game.viewH);
  const ts=Math.min(75,Game.viewW/10);
  ctx.shadowColor='#d92638';ctx.shadowBlur=20;
  ctx.fillStyle='#d92638';ctx.font='bold '+ts+'px monospace';ctx.textAlign='center';
  ctx.fillText(Game.isEvac ? 'ЭВАКУАЦИЯ УСПЕШНА' : 'П О Т Р А Ч Е Н О',Game.viewW/2,Game.viewH*0.32);
  ctx.shadowBlur=0;
  const ss=Math.max(13,Math.min(20,Game.viewW/36));
  ctx.fillStyle='#5a5a5a';ctx.font=ss+'px monospace';
  ctx.fillText('Убито: '+Game.kills+' · Волна: '+Game.wave+' · Этаж: '+(Game.level+1),Game.viewW/2,Game.viewH*0.32+ts*0.6);
  ctx.fillStyle='#0ea5c7';ctx.font='bold '+(ss+2)+'px monospace';
  let shardsText = 'ПОЛУЧЕНО ОСКОЛКОВ: +'+(Game.lastEarnedShards||0);
  if (DailyMode.active || Game.isDaily || Game.lastEarnedShards === 0 && Game.kills > 0) { // isDaily might be false after death logic runs, but we check if shards are 0 and kills > 0 to assume daily or just check if the date matches some temp flag. Let's just check if DailyMode.savedMeta exists.
     if (DailyMode.savedMeta || (Game.pendingScore && !Game.lastEarnedShards)) {
         shardsText = 'ДЕЙЛИ-РАН: ОСКОЛКИ НЕ ВЫДАЮТСЯ';
     }
  } else if (Game.lastContractsBonus && Game.lastContractsBonus > 0) {
    shardsText += ` (ВКЛЮЧАЯ БОНУС КОНТРАКТОВ +${Game.lastContractsBonus}%)`;
  }
  ctx.fillText(shardsText,Game.viewW/2,Game.viewH*0.32+ts*0.85);
  ctx.fillStyle='#e8a317';ctx.shadowColor='#e8a317';ctx.shadowBlur=6;
  ctx.font=ss+'px monospace';
  ctx.fillText('КЛИК / ТАП / ENTER заново',Game.viewW/2,Game.viewH*0.32+ts*1.15);
  ctx.shadowBlur=0;
  const list = (DailyMode.savedMeta || (Game.pendingScore && !Game.lastEarnedShards))
                ? JSON.parse(localStorage.getItem('dailyScores_' + getDailySeed()) || '[]')
                : Game.leaderboard;

  if(list.length){
    const sy=Game.viewH*0.32+ts*1.45;
    ctx.fillStyle='#1a1a1a';ctx.font='bold '+(ss-1)+'px monospace';
    ctx.fillText((DailyMode.savedMeta || (Game.pendingScore && !Game.lastEarnedShards)) ? 'РЕЗУЛЬТАТЫ ДЕЙЛИ-РАНА ЗА СЕГОДНЯ' : 'ТАБЛИЦА ЛИДЕРОВ',Game.viewW/2,sy);
    ctx.font=(ss-2)+'px monospace';
    for(let i=0;i<Math.min(5,list.length);i++){
      const e=list[i];ctx.fillStyle=i===0?'#e8a317':'#7a7a7a';
      ctx.fillText((i+1)+'. '+e.name+' — '+e.score+' очк.',Game.viewW/2,sy+26+i*(ss+2));
    }
  }
}

function wireNameEntry(){
  document.getElementById('btn-portal-descend').addEventListener('click', () => {
    document.getElementById('portal-ui').style.display='none';
    if(Game.state !== 'portal') return;

    Game.level++;
    // ensure wave bumps past the boss wave so we don't spawn another boss instantly
    if (Game.wave % 5 === 0) Game.wave++;
    applyLevelStart(Game, true);
 // true = continuation
    spawnBannerLevelUp(Game, Game.levelCfg);
    Game.state = 'play';
  });
  document.getElementById('btn-portal-evac').addEventListener('click', () => {
    document.getElementById('portal-ui').style.display='none';
    if(Game.state !== 'portal') return;
    Game.isEvac = true;
    Game.die(); // Complete run via die function, but mark as evac
  });
  document.getElementById('btn-portal-cancel').addEventListener('click', () => {
    document.getElementById('portal-ui').style.display='none';
    if(Game.state === 'portal') { Game.state = 'play'; Game.portalTriggerCd = 2.0; }
  });

  const form=document.getElementById('name-form');
  const inputEl=document.getElementById('name-input');
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const name=(inputEl.value||'ИГРОК').trim().slice(0,12)||'ИГРОК';
    Game.leaderboard=addEntry(Game.leaderboard,{name,...Game.pendingScore,date:Date.now()});
    Game.pendingScore=null;
    document.getElementById('name-entry').style.display='none';
    Game.state='death';
  });
}

function renderOperatorsUI() {
  const list = document.getElementById('operators-list');
  list.innerHTML = '';

  Object.keys(OPERATORS).forEach(opId => {
    const op = OPERATORS[opId];
    const isUnlocked = op.unlockedByDefault || metaState.unlockedOperators.includes(opId);
    const isSelected = metaState.lastOperator === opId;

    const row = document.createElement('div');
    row.style.cssText = `display:flex; justify-content:space-between; align-items:center; padding:12px; border:2px solid ${isSelected ? 'var(--ind)' : '#ccc'}; border-radius:8px; background:${isSelected ? '#e8f4f8' : (isUnlocked ? '#faf8f4' : '#eee')}; cursor:${isUnlocked ? 'pointer' : 'not-allowed'}; opacity:${isUnlocked ? '1' : '0.6'};`;

    row.innerHTML = `
      <div style="flex:1;">
        <div style="font-weight:bold; color:var(--bone); font-size:16px;">${op.name} ${isSelected ? '<span style="color:var(--ind); font-size:12px;">[ВЫБРАН]</span>' : ''}</div>
        <div style="font-size:12px; color:#5a5a5a; margin-top:4px;">${op.desc}</div>
        <div style="font-size:11px; color:var(--blood); margin-top:4px; font-weight:bold;">${op.statsText}</div>
        ${!isUnlocked ? `<div style="font-size:11px; color:#d92638; margin-top:4px; font-weight:bold;">ЗАБЛОКИРОВАНО (ЦЕНА: ${op.cost} ОСК. В МЕНЮ ПРОКАЧКИ)</div>` : ''}
      </div>
      <div style="width:40px; height:40px; border-radius:50%; background:${op.color1}; display:flex; justify-content:center; align-items:center; border:2px solid ${op.color2};">
         <div style="width:16px; height:6px; background:${op.color2};"></div>
      </div>
    `;

    if (isUnlocked) {
      row.onclick = () => {
        metaState.lastOperator = opId;
        saveMeta();
        renderOperatorsUI(); // re-render to show selection
      };
    }

    list.appendChild(row);
  });
}
