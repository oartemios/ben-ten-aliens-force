import { FORMS, createFormModels, setActiveForm, animateForm } from './aliens.js';
import { setupInput } from './input.js';
import { createOmnitrixUI } from './omnitrix.js';

export function startGame(){
  try{
    const canvas=document.getElementById('game');
    if(!BABYLON.Engine.isSupported())throw new Error('WebGL недоступен на этом устройстве');

    const engine=new BABYLON.Engine(canvas,true,{stencil:true,adaptToDeviceRatio:true});
    const scene=new BABYLON.Scene(engine);
    scene.clearColor=new BABYLON.Color4(.035,.05,.075,1);

    const hemi=new BABYLON.HemisphericLight('hemi',new BABYLON.Vector3(0,1,0),scene);hemi.intensity=.95;
    const sun=new BABYLON.DirectionalLight('sun',new BABYLON.Vector3(-.5,-1,.3),scene);sun.position.set(8,16,-10);sun.intensity=.7;

    const ground=BABYLON.MeshBuilder.CreateGround('ground',{width:42,height:42},scene);
    const gm=new BABYLON.StandardMaterial('groundMat',scene);gm.diffuseColor=new BABYLON.Color3(.13,.18,.19);gm.specularColor=BABYLON.Color3.Black();ground.material=gm;
    const bm=new BABYLON.StandardMaterial('blockMat',scene);bm.diffuseColor=new BABYLON.Color3(.22,.27,.34);
    [[-6,-5],[6,-4],[-7,6],[7,7]].forEach((p,i)=>{const b=BABYLON.MeshBuilder.CreateBox('block'+i,{width:3.5,height:2.6,depth:3.5},scene);b.position.set(p[0],1.3,p[1]);b.material=bm});

    const player=new BABYLON.TransformNode('player',scene);player.position.set(0,0,5);
    const models=createFormModels(scene,player);

    const enemy=BABYLON.MeshBuilder.CreateBox('enemy',{size:1.25},scene);enemy.position.set(0,.625,-6);
    const enemyMat=new BABYLON.StandardMaterial('enemyMat',scene);enemyMat.diffuseColor=new BABYLON.Color3(.75,.1,.12);enemy.material=enemyMat;

    const camera=new BABYLON.ArcRotateCamera('camera',-Math.PI/2,1.05,7.5,new BABYLON.Vector3(0,1.1,5),scene);
    camera.attachControl(canvas,true);camera.lowerRadiusLimit=5;camera.upperRadiusLimit=11;camera.lowerBetaLimit=.55;camera.upperBetaLimit=1.35;camera.panningSensibility=0;camera.angularSensibilityX=4500;camera.angularSensibilityY=4500;camera.pinchPrecision=70;

    let current='BEN',hp=100,enemyHp=100,enemyAlive=true,attackCD=0,enemyCD=0,transformCD=0;
    const abilityCD=Object.create(null);

    const pBar=document.getElementById('playerHpBar'),eBar=document.getElementById('enemyHpBar');
    const pTxt=document.getElementById('playerHpText'),eTxt=document.getElementById('enemyHpText');
    const badge=document.getElementById('formBadge'),stats=document.getElementById('stats');
    const abilityButtons=[document.getElementById('ability1Btn'),document.getElementById('ability2Btn')];
    const attackLabel=a=>({melee:'ближний бой',fireball:'огненный шар',heavy:'тяжёлый удар',sonic:'звуковая волна'}[a]);

    function cooldownKey(formId,slot){return `${formId}:${slot}`}

    function updateAbilityButtons(){
      const abilities=FORMS[current].abilities||[];
      abilityButtons.forEach((button,index)=>{
        const ability=abilities[index];
        const cd=ability ? Math.max(0,abilityCD[cooldownKey(current,index)]||0) : 0;
        button.classList.remove('ready','cooling','disabled');
        if(!ability){
          button.innerHTML='—<small>БЕН</small>';
          button.classList.add('disabled');
          button.setAttribute('aria-disabled','true');
        }else if(cd>0){
          button.innerHTML=`${ability.short}<small>${cd.toFixed(1)}с</small>`;
          button.classList.add('cooling');
          button.setAttribute('aria-disabled','true');
        }else{
          button.innerHTML=`${ability.short}<small>готово</small>`;
          button.classList.add('ready');
          button.setAttribute('aria-disabled','false');
        }
      });
    }

    function hud(){
      const f=FORMS[current];
      pBar.style.width=Math.max(0,hp)+'%';eBar.style.width=Math.max(0,enemyHp)+'%';
      pTxt.textContent=Math.max(0,Math.ceil(hp));eTxt.textContent=Math.max(0,Math.ceil(enemyHp));
      badge.textContent=f.name;badge.style.background=f.color;
      const names=(f.abilities||[]).map(a=>a.name).join(' · ');
      stats.textContent=`Скорость ${f.speed} · урон ${f.damage} · ${attackLabel(f.attack)}${names?' · '+names:''}`;
      updateAbilityButtons();
    }

    function fx(position,color,diameter=1.4,duration=.28){
      const s=BABYLON.MeshBuilder.CreateSphere('fx',{diameter,segments:10},scene);s.position.copyFrom(position);
      const m=new BABYLON.StandardMaterial('fxMat',scene);m.emissiveColor=color;m.alpha=.78;s.material=m;
      let t=0;const ob=scene.onBeforeRenderObservable.add(()=>{
        const dt=engine.getDeltaTime()/1000;t+=dt;s.scaling.scaleInPlace(1+5*dt);m.alpha=Math.max(0,.78-t/duration*.78);
        if(t>duration){scene.onBeforeRenderObservable.remove(ob);s.dispose();m.dispose()}
      });
    }

    function ringFx(position,color,diameter=2.4,duration=.4){
      const ring=BABYLON.MeshBuilder.CreateTorus('abilityRing',{diameter,thickness:.11,tessellation:36},scene);
      ring.position.copyFrom(position);ring.position.y=.16;ring.rotation.x=Math.PI/2;
      const mat=new BABYLON.StandardMaterial('abilityRingMat',scene);mat.emissiveColor=color;mat.diffuseColor=color;mat.alpha=.9;ring.material=mat;
      let t=0;const ob=scene.onBeforeRenderObservable.add(()=>{
        const dt=engine.getDeltaTime()/1000;t+=dt;ring.scaling.scaleInPlace(1+3.7*dt);mat.alpha=Math.max(0,.9-t/duration*.9);
        if(t>duration){scene.onBeforeRenderObservable.remove(ob);ring.dispose();mat.dispose()}
      });
    }

    function transformTo(id){
      if(!FORMS[id]||transformCD>0||id===current)return;
      transformCD=.7;
      fx(player.position.add(new BABYLON.Vector3(0,1.2,0)),new BABYLON.Color3(0,1,.2),2,.38);
      current=id;setActiveForm(models,current);hud();
    }

    function damageEnemy(amount){
      if(!enemyAlive)return;
      enemyHp-=amount;fx(enemy.position,new BABYLON.Color3(1,.08,.02),.9);
      if(enemyHp<=0){
        enemyHp=0;enemyAlive=false;enemy.setEnabled(false);
        setTimeout(()=>{enemyHp=100;enemyAlive=true;enemy.position.set((Math.random()-.5)*12,.625,-5-Math.random()*6);enemy.setEnabled(true);hud()},900);
      }
      hud();
    }

    function cameraDirection(yawOffset=0){
      let dir=camera.getForwardRay().direction.clone();dir.y*=.12;dir.normalize();
      if(yawOffset!==0)dir=BABYLON.Vector3.TransformNormal(dir,BABYLON.Matrix.RotationY(yawOffset)).normalize();
      return dir;
    }

    function shootProjectile({name='projectile',damage,speed=12,diameter=.42,color=new BABYLON.Color3(1,.18,0),life=1.2,grow=0,yaw=0,explosion=0}){
      const orb=BABYLON.MeshBuilder.CreateSphere(name,{diameter,segments:10},scene);
      const material=new BABYLON.StandardMaterial(name+'Mat',scene);material.emissiveColor=color;material.diffuseColor=color;material.alpha=.86;orb.material=material;
      const dir=cameraDirection(yaw);
      orb.position.copyFrom(player.position);orb.position.y+=FORMS[current].cameraHeight;orb.position.addInPlace(dir.scale(.9));
      let age=0;
      const ob=scene.onBeforeRenderObservable.add(()=>{
        const dt=Math.min(engine.getDeltaTime()/1000,.05);age+=dt;
        orb.position.addInPlace(dir.scale(speed*dt));
        if(grow)orb.scaling.scaleInPlace(1+grow*dt);
        if(enemyAlive&&BABYLON.Vector3.Distance(orb.position,enemy.position)<Math.max(.9,diameter*.75)){
          damageEnemy(damage);
          if(explosion)fx(orb.position,color,explosion,.38);
          cleanup();return;
        }
        if(age>life)cleanup();
      });
      function cleanup(){scene.onBeforeRenderObservable.remove(ob);orb.dispose();material.dispose()}
    }

    function normalProjectile(kind){
      const f=FORMS[current];
      if(kind==='sonic'){
        shootProjectile({name:'sonic',damage:f.damage,speed:15,diameter:.55,color:new BABYLON.Color3(.65,.9,1),life:1.15,grow:1.4});
      }else{
        shootProjectile({name:'fireball',damage:f.damage,speed:12,diameter:.42,color:new BABYLON.Color3(1,.18,0),life:1.15});
      }
    }

    function radialAttack(radius,damage,color,diameter){
      ringFx(player.position,color,diameter,.42);
      fx(player.position.add(new BABYLON.Vector3(0,.5,0)),color,diameter*.55,.3);
      if(enemyAlive&&BABYLON.Vector3.Distance(player.position,enemy.position)<=radius)damageEnemy(damage);
    }

    function heavyAttack(){
      fx(player.position.add(new BABYLON.Vector3(0,.25,0)),new BABYLON.Color3(.8,.5,.18),2.7,.36);
      if(enemyAlive&&BABYLON.Vector3.Distance(player.position,enemy.position)<3.2)damageEnemy(FORMS[current].damage);
    }

    function meleeAttack(){
      fx(player.position.add(new BABYLON.Vector3(0,.25,0)),new BABYLON.Color3(0,1,.2),1.3);
      if(enemyAlive&&BABYLON.Vector3.Distance(player.position,enemy.position)<2.5)damageEnemy(FORMS[current].damage);
    }

    function fireBurst(){radialAttack(4.2,46,new BABYLON.Color3(1,.22,.02),4.4)}
    function meteor(){
      shootProjectile({name:'meteor',damage:82,speed:9,diameter:1,color:new BABYLON.Color3(1,.12,0),life:1.65,grow:.18,explosion:3.2});
    }
    function groundSlam(){radialAttack(4.6,68,new BABYLON.Color3(.72,.43,.17),5.2)}
    function charge(){
      const dir=cameraDirection();dir.y=0;dir.normalize();
      ringFx(player.position,new BABYLON.Color3(.75,.52,.23),2.2,.28);
      player.position.addInPlace(dir.scale(4.8));
      player.position.x=Math.max(-20,Math.min(20,player.position.x));player.position.z=Math.max(-20,Math.min(20,player.position.z));
      fx(player.position.add(new BABYLON.Vector3(0,1.2,0)),new BABYLON.Color3(.65,.38,.15),1.6,.26);
      if(enemyAlive&&BABYLON.Vector3.Distance(player.position,enemy.position)<2.8)damageEnemy(84);
    }
    function sonicBurst(){radialAttack(4.4,40,new BABYLON.Color3(.58,.88,1),4.8)}
    function echoVolley(){
      const color=new BABYLON.Color3(.66,.92,1);
      fx(player.position.add(new BABYLON.Vector3(-.65,.75,0)),color,.7,.35);
      fx(player.position.add(new BABYLON.Vector3(.65,.75,0)),color,.7,.35);
      [-.13,0,.13].forEach((yaw,i)=>setTimeout(()=>shootProjectile({name:'echoVolley',damage:22,speed:16,diameter:.46,color,life:1.15,grow:1,yaw}),i*80));
    }

    const abilityHandlers={fireBurst,meteor,groundSlam,charge,sonicBurst,echoVolley};

    let omni;
    function attack(){
      const f=FORMS[current];
      if(attackCD>0||omni?.isOpen())return;
      attackCD=f.cooldown;
      if(f.attack==='fireball')normalProjectile('fireball');
      else if(f.attack==='sonic')normalProjectile('sonic');
      else if(f.attack==='heavy')heavyAttack();
      else meleeAttack();
    }

    function useAbility(slot){
      if(omni?.isOpen())return;
      const ability=FORMS[current].abilities?.[slot];
      if(!ability)return;
      const key=cooldownKey(current,slot);
      if((abilityCD[key]||0)>0)return;
      abilityCD[key]=ability.cooldown;
      abilityHandlers[ability.kind]?.();
      updateAbilityButtons();
    }

    omni=createOmnitrixUI(transformTo);
    const input=setupInput(canvas,attack,()=>omni.toggle(),()=>useAbility(0),()=>useAbility(1));

    scene.onBeforeRenderObservable.add(()=>{
      const dt=Math.min(engine.getDeltaTime()/1000,.05);
      attackCD-=dt;enemyCD-=dt;transformCD-=dt;
      Object.keys(abilityCD).forEach(key=>abilityCD[key]=Math.max(0,abilityCD[key]-dt));

      const {x,y}=input.movement();
      if(!omni.isOpen()&&(Math.abs(x)>.05||Math.abs(y)>.05)){
        const forward=camera.getForwardRay().direction.clone();forward.y=0;forward.normalize();
        const right=BABYLON.Vector3.Cross(BABYLON.Axis.Y,forward).normalize();
        const move=forward.scale(y).add(right.scale(x));
        if(move.lengthSquared()>.001){
          move.normalize();player.position.addInPlace(move.scale(FORMS[current].speed*dt));
          player.position.x=Math.max(-20,Math.min(20,player.position.x));player.position.z=Math.max(-20,Math.min(20,player.position.z));
          player.rotation.y=Math.atan2(move.x,move.z);
        }
      }

      if(enemyAlive&&!omni.isOpen()){
        const d=player.position.subtract(enemy.position);d.y=0;const dist=d.length();
        if(dist<12&&dist>1.35){d.normalize();enemy.position.addInPlace(d.scale(1.8*dt))}
        if(dist<=1.5&&enemyCD<=0){
          enemyCD=.9;hp-=11*FORMS[current].resistance;
          if(hp<=0){hp=100;player.position.set(0,0,5);current='BEN';setActiveForm(models,current)}
          hud();
        }
      }

      animateForm(models,current,performance.now());
      updateAbilityButtons();
      const target=player.position.add(new BABYLON.Vector3(0,FORMS[current].cameraHeight,0));
      camera.target=BABYLON.Vector3.Lerp(camera.target,target,.18);
    });

    hud();document.getElementById('boot').classList.add('good');
    engine.runRenderLoop(()=>scene.render());
    addEventListener('resize',()=>engine.resize());
  }catch(err){
    console.error(err);
    document.getElementById('bootTitle').textContent='Ошибка запуска 3D';
    document.getElementById('bootText').textContent=err?.message||String(err);
  }
}
