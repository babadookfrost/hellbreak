const isMobile='ontouchstart' in window||navigator.maxTouchPoints>0;
const Input={keys:{},mouse:{x:0,y:0},stick:{active:false,dx:0,dy:0},fireReq:false,wantReload:false,wantDash:false,cmd:false,dashDirX:0,dashDirY:0,clickUpgrades:false};
let stickTouchId=null,aimTouchId=null;
function initInput(canvas){
  window.addEventListener('keydown',e=>{
    if(e.repeat)return;
    Input.keys[e.code]=true;
    if(e.code==='KeyC'||e.code==='ControlLeft'||e.code==='ControlRight')Input.wantWalk=true;
    if(e.code==='ShiftLeft'||e.code==='ShiftRight')Input.wantDash=true;
    if(e.code==='KeyR')Input.wantReload=true;
    if(e.code==='Enter'||e.code==='Space')Input.cmd=true;
    if(e.code==='KeyD')Input.wantDaily=true;
    if(e.code==='KeyI'||e.code==='Tab'){ e.preventDefault(); Input.wantInventory=true; }
  });
  window.addEventListener('keyup',e=>{Input.keys[e.code]=false;
    if(e.code==='KeyC'||e.code==='ControlLeft'||e.code==='ControlRight')Input.wantWalk=false;});

  const toScreen=(cx,cy)=>{return{x:cx,y:cy};};
  canvas.addEventListener('mousemove',e=>{const p=toScreen(e.clientX,e.clientY);Input.mouse.x=p.x;Input.mouse.y=p.y;});
  canvas.addEventListener('mousedown',e=>{initAudio();const p=toScreen(e.clientX,e.clientY);Input.mouse.x=p.x;Input.mouse.y=p.y;Input.fireReq=true;Input.cmd=true;
    if (Game.state === 'menu') {
      const uw = 200, uh = 40;
      const ux = Game.viewW/2 - uw/2, uy = Game.viewH*0.75 - uh/2;
      if (Input.mouse.x >= ux && Input.mouse.x <= ux+uw && Input.mouse.y >= uy && Input.mouse.y <= uy+uh) {
        Input.clickUpgrades = true;
        Input.cmd = false;
      } else if (window.dailyBtnRect && Input.mouse.x >= window.dailyBtnRect.x && Input.mouse.x <= window.dailyBtnRect.x+window.dailyBtnRect.w && Input.mouse.y >= window.dailyBtnRect.y && Input.mouse.y <= window.dailyBtnRect.y+window.dailyBtnRect.h) {
        Input.wantDaily = true;
        Input.cmd = false;
      }
    }
  });
  canvas.addEventListener('mouseup',()=>{Input.fireReq=false;});
  window.addEventListener('contextmenu',e=>e.preventDefault());

  if(isMobile){
    document.getElementById('touch-ui').style.display='block';
    const stk=document.getElementById('stick-base'),knb=document.getElementById('stick-knob');
    const getStickCenter=()=>{const r=stk.getBoundingClientRect();return {x:r.left+r.width/2, y:r.top+r.height/2, r:r.width/2};};
    const isStickZone=(t)=>{const c=getStickCenter();const pad=35;return (t.clientX <= c.x + c.r + pad && t.clientY >= c.y - c.r - pad);};
    const updateStick=(t)=>{const c=getStickCenter();let dx=t.clientX-c.x, dy=t.clientY-c.y;const maxR=c.r*0.8;const mag=Math.hypot(dx,dy);if(mag>maxR){dx*=maxR/mag;dy*=maxR/mag;}knb.style.transform='translate('+dx+'px,'+dy+'px)';Input.stick.dx=dx/maxR;Input.stick.dy=dy/maxR;Input.stick.active=true;Input.wantWalk=mag < (maxR * 0.6);};
    const resetStick=()=>{stickTouchId=null;Input.stick.active=false;Input.stick.dx=0;Input.stick.dy=0;knb.style.transform='translate(0px, 0px)';};

    canvas.addEventListener('touchstart',e=>{
      initAudio();
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];
        if(stickTouchId===null && isStickZone(t)){stickTouchId=t.identifier;updateStick(t);}
        else if(aimTouchId===null && t.identifier!==stickTouchId){
          aimTouchId=t.identifier;Input.mouse.x=t.clientX;Input.mouse.y=t.clientY;Input.fireReq=true;Input.cmd=true;
          if (Game.state === 'menu') {
            const uw = 200, uh = 40;
            const ux = Game.viewW/2 - uw/2, uy = Game.viewH*0.75 - uh/2;
            if (Input.mouse.x >= ux && Input.mouse.x <= ux+uw && Input.mouse.y >= uy && Input.mouse.y <= uy+uh) {
              Input.clickUpgrades = true;
              Input.cmd = false;
            } else if (window.dailyBtnRect && Input.mouse.x >= window.dailyBtnRect.x && Input.mouse.x <= window.dailyBtnRect.x+window.dailyBtnRect.w && Input.mouse.y >= window.dailyBtnRect.y && Input.mouse.y <= window.dailyBtnRect.y+window.dailyBtnRect.h) {
              Input.wantDaily = true;
              Input.cmd = false;
            }
          }
        }
      }
    },{passive:true});

    canvas.addEventListener('touchmove',e=>{
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];
        if(t.identifier===stickTouchId){updateStick(t);}
        else if(t.identifier===aimTouchId){Input.mouse.x=t.clientX;Input.mouse.y=t.clientY;}
      }
    },{passive:true});

    canvas.addEventListener('touchend',e=>{
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];
        if(t.identifier===stickTouchId){resetStick();}
        if(t.identifier===aimTouchId){aimTouchId=null;Input.fireReq=false;}
      }
    },{passive:true});

    canvas.addEventListener('touchcancel',e=>{
      for(let i=0;i<e.changedTouches.length;i++){
        const t=e.changedTouches[i];
        if(t.identifier===stickTouchId){resetStick();}
        if(t.identifier===aimTouchId){aimTouchId=null;Input.fireReq=false;}
      }
    },{passive:true});

    document.getElementById('btn-reload').addEventListener('touchstart',e=>{Input.wantReload=true;},{passive:true});
    document.getElementById('btn-dash').addEventListener('touchstart',e=>{Input.dashDirX=Input.stick.dx||1;Input.dashDirY=Input.stick.dy||0;Input.wantDash=true;},{passive:true});
    document.getElementById('btn-inventory').addEventListener('touchstart',e=>{Input.wantInventory=true;},{passive:true});
  }
}

function getMoveVector(){
  let mx=0,my=0;
  if(Input.keys['KeyW']||Input.keys['ArrowUp'])my-=1;
  if(Input.keys['KeyS']||Input.keys['ArrowDown'])my+=1;
  if(Input.keys['KeyA']||Input.keys['ArrowLeft'])mx-=1;
  if(Input.keys['KeyD']||Input.keys['ArrowRight'])mx+=1;
  if(!mx&&!my&&Input.stick.active){mx=Input.stick.dx;my=Input.stick.dy;}
  return{mvX:mx,mvY:my};
}
