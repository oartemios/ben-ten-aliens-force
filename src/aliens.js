export const FORMS = {
  BEN: { id:'BEN', name:'БЕН', speed:4.7, damage:20, cooldown:.42, color:'#22bd54', cameraHeight:1.05, resistance:1, attack:'melee' },
  HEATBLAST: { id:'HEATBLAST', name:'ПЛАМЕННЫЙ', speed:5.7, damage:32, cooldown:.55, color:'#ef651a', cameraHeight:1.35, resistance:.72, attack:'fireball' },
  HUMUNGOUSAUR: { id:'HUMUNGOUSAUR', name:'ГУМАНГОЗАВР', speed:3.9, damage:52, cooldown:.78, color:'#a87a42', cameraHeight:1.8, resistance:.48, attack:'heavy' },
  ECHO_ECHO: { id:'ECHO_ECHO', name:'ЭХО ЭХО', speed:6.2, damage:24, cooldown:.48, color:'#d9e5ec', cameraHeight:.82, resistance:.86, attack:'sonic' }
};

function mat(scene,name,diffuse,emissive=null){
  const m=new BABYLON.StandardMaterial(name,scene);
  m.diffuseColor=BABYLON.Color3.FromHexString(diffuse);
  if(emissive)m.emissiveColor=BABYLON.Color3.FromHexString(emissive);
  return m;
}
function capsule(scene,parent,name,opts,y,material){
  const mesh=BABYLON.MeshBuilder.CreateCapsule(name,opts,scene);
  mesh.parent=parent;mesh.position.y=y;mesh.material=material;return mesh;
}

export function createFormModels(scene,player){
  const models={};

  const ben=new BABYLON.TransformNode('benForm',scene);ben.parent=player;
  const dark=mat(scene,'benDark','#12191d'),green=mat(scene,'benGreen','#159a34'),skin=mat(scene,'skin','#d99c72');
  capsule(scene,ben,'benBody',{height:1.55,radius:.38},1,dark);
  const shirt=BABYLON.MeshBuilder.CreateBox('benShirt',{width:.8,height:.72,depth:.48},scene);shirt.parent=ben;shirt.position.set(0,1.18,0);shirt.material=green;
  const head=BABYLON.MeshBuilder.CreateSphere('benHead',{diameter:.58,segments:12},scene);head.parent=ben;head.position.set(0,1.95,0);head.material=skin;
  models.BEN=ben;

  const heat=new BABYLON.TransformNode('heatblastForm',scene);heat.parent=player;heat.setEnabled(false);
  const fire=mat(scene,'fire','#d32e08','#681100'),rock=mat(scene,'rock','#171414');
  capsule(scene,heat,'heatBody',{height:2.3,radius:.55},1.28,fire);
  const chest=BABYLON.MeshBuilder.CreateBox('heatChest',{width:.95,height:.78,depth:.6},scene);chest.parent=heat;chest.position.set(0,1.55,0);chest.material=rock;
  const flame=BABYLON.MeshBuilder.CreateCylinder('heatFlame',{height:1.1,diameterTop:.05,diameterBottom:.65,tessellation:10},scene);flame.parent=heat;flame.position.set(0,2.9,0);flame.material=fire;
  const fireLight=new BABYLON.PointLight('fireLight',new BABYLON.Vector3(0,2.1,0),scene);fireLight.parent=heat;fireLight.diffuse=new BABYLON.Color3(1,.22,.03);fireLight.intensity=1.2;fireLight.range=7;
  heat.metadata={flame,fireLight};models.HEATBLAST=heat;

  const hum=new BABYLON.TransformNode('humungousaurForm',scene);hum.parent=player;hum.setEnabled(false);
  const humSkin=mat(scene,'humSkin','#8c693e'),humDark=mat(scene,'humDark','#3c2b1d');
  capsule(scene,hum,'humBody',{height:3.05,radius:.8},1.62,humSkin);
  const humChest=BABYLON.MeshBuilder.CreateBox('humChest',{width:1.45,height:1.0,depth:.85},scene);humChest.parent=hum;humChest.position.set(0,1.9,0);humChest.material=humDark;
  const humHead=BABYLON.MeshBuilder.CreateSphere('humHead',{diameter:.9,segments:12},scene);humHead.parent=hum;humHead.position.set(0,3.1,0);humHead.material=humSkin;
  models.HUMUNGOUSAUR=hum;

  const echo=new BABYLON.TransformNode('echoEchoForm',scene);echo.parent=player;echo.setEnabled(false);
  const white=mat(scene,'echoWhite','#dce7eb'),black=mat(scene,'echoBlack','#1c2428'),echoGreen=mat(scene,'echoGreen','#42ff71','#0d4b1b');
  capsule(scene,echo,'echoBody',{height:1.15,radius:.34},.72,white);
  const echoHead=BABYLON.MeshBuilder.CreateSphere('echoHead',{diameter:.65,segments:12},scene);echoHead.parent=echo;echoHead.position.set(0,1.42,0);echoHead.material=white;
  const face=BABYLON.MeshBuilder.CreateBox('echoFace',{width:.42,height:.18,depth:.05},scene);face.parent=echo;face.position.set(0,1.42,-.31);face.material=black;
  const omni=BABYLON.MeshBuilder.CreateTorus('echoOmni',{diameter:.26,thickness:.08,tessellation:18},scene);omni.parent=echo;omni.position.set(0,.78,-.32);omni.rotation.x=Math.PI/2;omni.material=echoGreen;
  models.ECHO_ECHO=echo;

  return models;
}

export function setActiveForm(models,id){
  Object.entries(models).forEach(([key,node])=>node.setEnabled(key===id));
}
export function animateForm(models,id,time){
  if(id==='HEATBLAST'&&models.HEATBLAST.metadata?.flame){
    models.HEATBLAST.metadata.flame.scaling.y=1+Math.sin(time*.02)*.08;
    models.HEATBLAST.metadata.flame.rotation.y+=.035;
  }
}
