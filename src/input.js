export function setupInput(canvas, onAttack, onOmni, onAbility1, onAbility2) {
  const keys = Object.create(null);
  let joyX=0, joyY=0, joyPointer=null;
  const pad=document.getElementById('leftPad');
  const stick=document.getElementById('stick');

  const setJoy=e=>{
    const r=pad.getBoundingClientRect();
    let x=e.clientX-(r.left+r.width/2), y=e.clientY-(r.top+r.height/2);
    const max=Math.max(34,r.width*.34), len=Math.hypot(x,y);
    if(len>max){x=x/len*max;y=y/len*max}
    stick.style.transform=`translate(${x}px,${y}px)`;
    joyX=x/max; joyY=y/max;
  };
  pad.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;pad.setPointerCapture(e.pointerId);setJoy(e)});
  pad.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)setJoy(e)});
  const end=e=>{if(e.pointerId!==joyPointer)return;joyPointer=null;joyX=joyY=0;stick.style.transform='translate(0,0)'};
  pad.addEventListener('pointerup',end); pad.addEventListener('pointercancel',end);

  const bindPress=(id,callback)=>{
    document.getElementById(id).addEventListener('pointerdown',e=>{e.preventDefault();callback()});
  };
  bindPress('attackBtn',onAttack);
  bindPress('omniBtn',onOmni);
  bindPress('ability1Btn',onAbility1);
  bindPress('ability2Btn',onAbility2);

  addEventListener('keydown',e=>{
    keys[e.code]=true;
    if(e.code==='Space'){e.preventDefault();onAttack()}
    if(e.code==='KeyQ'){e.preventDefault();onOmni()}
    if(e.code==='KeyE'||e.code==='Digit1'){e.preventDefault();onAbility1()}
    if(e.code==='KeyR'||e.code==='Digit2'){e.preventDefault();onAbility2()}
  });
  addEventListener('keyup',e=>keys[e.code]=false);

  return {
    movement(){
      let x=joyX, y=-joyY;
      if(keys.KeyA)x-=1;if(keys.KeyD)x+=1;if(keys.KeyW)y+=1;if(keys.KeyS)y-=1;
      return {x,y};
    }
  };
}
