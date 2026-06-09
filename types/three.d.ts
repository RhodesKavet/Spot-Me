// Minimal ambient declaration so TypeScript doesn't error on `import('three')`.
// globe.gl bundles Three.js but doesn't ship separate typings for it.
declare module 'three' {
  export class BufferGeometry {
    setAttribute(name: string, attribute: BufferAttribute): this
  }
  export class BufferAttribute {
    constructor(array: Float32Array, itemSize: number)
  }
  export class PointsMaterial {
    constructor(params: {
      color?: number
      size?: number
      sizeAttenuation?: boolean
      transparent?: boolean
      opacity?: number
    })
  }
  export class Points {
    constructor(geometry: BufferGeometry, material: PointsMaterial)
  }
}
