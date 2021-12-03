const addBlendingToMaterials = (gltf) => {
  console.log('addBlendingToMaterials', gltf)
  gltf.scene.traverse(function (element) {
    // if (element.type === 'Mesh' && element.material && element.material.userData && element.material.userData.BlendType && element.material.userData.BlendType === 'SubtractiveBlending') {
    if (element.type === 'Mesh' && element.material && element.material.userData && element.material.userData.BlendType) {
      console.log('element', element)
      switch (element.material.userData.BlendType) {
        case 'AdditiveBlending': element.material.blending = 2; break // This PROBABLY should take into account srcBlend & srcDest
        case 'SubtractiveBlending': element.material.blending = 3; break // Still a lot to do here, look at fiba -> https://youtu.be/1U39x6jNKoI?t=66
        case 'MultiplyBlending': element.material.blending = 4; break
        default: break
      }
    }
  })
}
export {
  addBlendingToMaterials
}
