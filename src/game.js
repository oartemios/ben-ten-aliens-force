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

    const pBar=document.getElementById('playerHpBar'),eBar=document.getElementById('enemyHpBar');
    const pTxt=document.getElementById('playerHpText'),eTxt=document.getElementById('enemyHpText');
    const badge=document.getElementById('formBadge'),stats=document.getElementById('stats');
    const attackLabel=a=>({melee:'ближний бой',fireball:'огненный шар',heavy:'тяжёлый удар',sonic:'звуковая волна'}[a]);

    function hud(){
      const f=FORMS[current];
      pBar.style.width=Math.max(0,hp)+'%';eBar.style.width=Math.max(0,enemyHp)+'%';
      pTxt.textContent=Math.max(0,Math.ceil(hp));eTxt.textContent=Math.max(0,Math.ceil(enemyHp));
      badge.textContent=f.name;badge.style.background=f.color;
      stats.textContent=`Скорость ${f.speed} · урон ${f.damage} · ${attackLabel(f.attack)}`;
    }

    function fx(position,color,diameter=1.4,duration=.28){
      const s=BABYLON.MeshBuilder.CreateSphere('fx',{diameter,segments:10},scene);s.position.copyFrom(position);
      const m=new BABYLON.StandardMaterial('fxMat',scene);m.emissiveColor=color;m.alpha=.78;s.material=m;
      let t=0;const ob=scene.onBeforeRenderObservable.add(()=>{const dt=engine.getDeltaTime()/1000;t+=dt;s.scaling.scaleInPlace(1+5*dt);m.alpha=Math.max(0,.78-t/duration*.78);if(t>duration){scene.onBeforeRenderObservable.remove(ob);s.dispose();m.dispose()}});
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

    function projectile(kind){
      const f=FORMS[current];
      const orb=BABYLON.MeshBuilder.CreateSphere(kind,{diameter:kind==='sonic'?.55:.42,segments:10},scene);
      const m=new BABYLON.StandardMaterial(kind+'Mat',scene);
      if(kind==='sonic'){m.emissiveColor=new BABYLON.Color3(.65,.9,1);m.alpha=.72}else m.emissiveColor=new BABYLON.Color3(1,.18,0);
      orb.material=m;
      const dir=camera.getForwardRay().direction.clone();dir.y*=.12;dir.normalize();
      orb.position.copyFrom(player.position);orb.position.y+=f.cameraHeight;orb.position.addInPlace(dir.scale(.8));
      let life=0;
      const ob=scene.onBeforeRenderObservable.add(()=>{
        const dt=Math.min(engine.getDeltaTime()/1000,.05);life+=dt;
        orb.position.addInPlace(dir.scale((kind==='sonic'?15:12)*dt));
        if(kind==='sonic')orb.scaling.scaleInPlace(1+1.5*dt);
        if(enemyAlive&&BABYLON.Vector3.Distance(orb.position,enemy.position)<1){damageEnemy(f.damage);cleanup();return}
        if(life>1.15)cleanup();
      });
      function cleanup(){scene.onBeforeRenderObservable.remove(ob);orb.dispose();m.dispose()}
    }

    function heavyAttack(){
      const f=FORMS[current];
      fx(player.position.add(new BABYLON.Vector3(0,.25,0)),new BABYLON.Color3(.8,.5,.18),2.7,.36);
      if(enemyAlive&&BABYLON.Vector3.Distance(player.position,enemy.position)<3.2)damageEnemy(f.damage);
    }

    function meleeAttack(){
      fx(player.position.add(new BABYLON.Vector3(0,.25,0)),new BABYLON.Color3(0,1,.2),1.3);
      if(enemyAlive&&BABYLON.Vector3.Distance(player.position,enemy.position)<2.5)damageEnemy(FORMS[current].damage);
    }

    let omni;
    function attack(){
      const f=FORMS[current];
      if(attackCD>0||omni?.isOpen())return;
      attackCD=f.cooldown;
      if(f.attack==='fireball')projectile('fireball');
      else if(f.attack==='sonic')projectile('sonic');
      else if(f.attack==='heavy')heavyAttack();
      else meleeAttack();
    }

    omni=createOmnitrixUI(transformTo);
    const input=setupInput(canvas,attack,()=>omni.toggle());

    scene.onBeforeRenderObservable.add(()=>{
      const dt=Math.min(engine.getDeltaTime()/1000,.05);attackCD-=dt;enemyCD-=dt;transformCD-=dt;
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
