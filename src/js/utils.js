import * as THREE from "three";

export function getAllChildrenNames(meshRef, model) {
  const children = [];
  if (typeof meshRef === "string") {
    const main = model.getObjectByName(meshRef);
    if (main.isMesh) {
      children.push(main.name);
    } else {
      main.children.forEach(child => {
        children.push(child.name);
      });
    }
    return children;
  } else if (Array.isArray(meshRef)) {
    meshRef.forEach(ref => {
      children.push(...this.getAllChildrenNames(ref, model));
    });
    return children;
  }
}
export function setMeshesColor(meshRef, model, color) {
  const childrenNames = this.getAllChildrenNames(meshRef, model);
  childrenNames.forEach(childName => {
    const child = model.getObjectByName(childName);
    if (child.isMesh) {
      child.material.dispose();
      child.material.color = new THREE.Color(color);
    }
  });
}

export function forEachMeshes(meshRef, model, func) {
  const childrenNames = this.getAllChildrenNames(meshRef, model);
  childrenNames.forEach(func);
}

export function setMeshesMap(meshRef, model, texture) {
  const childrenNames = this.getAllChildrenNames(meshRef, model);
  childrenNames.forEach(childName => {
    const child = model.getObjectByName(childName);
    if (!texture) {
      child.material.map = null;
    } else {
      const diffuse = this.getTexture(texture);
      child.material.map = diffuse;
    }
    child.material.needsUpdate = true;
  });
}

export function getTexture(name) {
  const texture = new THREE.TextureLoader().load(name);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function invertHex(hex) {
  return (Number(`0x1${hex}`) ^ 0xffffff)
    .toString(16)
    .substr(1)
    .toUpperCase();
}
