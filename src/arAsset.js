import {Box3,Vector3,FrontSide} from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {USDZExporter} from 'three/addons/exporters/USDZExporter.js';
// Snapshot the real assembled R3F model: no substitute mesh, no flattened picture.
export async function createARAsset(source,{quickLook=false}={}){
 const root=source.clone(true),ownedGeometries=new Set(),ownedMaterials=new Set();
 root.position.set(0,0,0);root.rotation.set(0,0,0);root.scale.set(1,1,1);
 // Screen-only effects (additive bloom) have no glTF/USDZ equivalent.
 const skipped=[];root.traverse(o=>{if(o.userData.arSkip)skipped.push(o)});skipped.forEach(o=>o.removeFromParent());
 root.traverse(o=>{
  if(!o.isMesh)return;
  o.geometry=o.geometry.clone();ownedGeometries.add(o.geometry);
  const copy=m=>{const n=m.clone();if(!m.userData.glow){n.emissive?.set(0);n.emissiveIntensity=0}n.side=FrontSide;ownedMaterials.add(n);return n};
  o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);
  o.userData={};
 });
 root.updateMatrixWorld(true);
 const bounds=new Box3().setFromObject(root),size=bounds.getSize(new Vector3());
 // Model viewer uses the -Z bounding plane for wall placement. Keep Y upright.
 const center=bounds.getCenter(new Vector3());root.position.set(-center.x,-center.y,-bounds.min.z);
 root.updateMatrixWorld(true);root.name='ATRIA';root.userData={units:'metres',sizeMetres:size.toArray()};
 try{
  // Export before the tap. Quick Look must open synchronously from a real link,
  // without waiting for another WebGL viewer or asynchronous USDZ conversion.
  const binary=quickLook
   ?await new USDZExporter().parseAsync(root,{includeAnchoringProperties:false,maxTextureSize:1536})
   :await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true,maxTextureSize:1536});
  const type=quickLook?'model/vnd.usdz+zip':'model/gltf-binary';
  return {url:URL.createObjectURL(new Blob([binary],{type})),type,size:size.toArray(),bytes:binary.byteLength};
 }finally{ownedGeometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose())}
}
