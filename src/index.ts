type TypeName =
  | "u8" | "u16" | "u32" | "u64"
  | "i8" | "i16" | "i32" | "i64"
  | "f32" | "f64";

interface BintInstance {
  (value: number): BintInstance
  readonly [index: number]: number | bigint
  toBuffer(): ArrayBuffer
}

interface BintFactory {
  (): BintInstance
  fromBuffer(buffer: ArrayBuffer): BintInstance
}

const typeIds: Record<TypeName, number> = {
  u8: 1, u16: 2, u32: 3, u64: 4,
  i8: 5, i16: 6, i32: 7, i64: 8,
  f32: 9, f64: 10,
}

const idToType: Record<number, TypeName> = {
  1: "u8", 2: "u16", 3: "u32", 4: "u64",
  5: "i8", 6: "i16", 7: "i32", 8: "i64",
  9: "f32", 10: "f64",
}

const F32_MAX = 3.4028234663852886e38

function identifyBestType(num: number): TypeName {
  if (!Number.isFinite(num)) return "f64"

  if (!Number.isInteger(num)) {
    if (num >= -F32_MAX && num <= F32_MAX && Math.fround(num) === num) {
      return "f32"
    }
    return "f64"
  }

  if (num >= 0) {
    if (num <= 0xff) return "u8"
    if (num <= 0xffff) return "u16"
    if (num <= 0xffffffff) return "u32"
    if (Number.isSafeInteger(num)) return "u64"
    return "f64"
  }

  if (num >= -0x80) return "i8"
  if (num >= -0x8000) return "i16"
  if (num >= -0x80000000) return "i32"
  if (Number.isSafeInteger(num)) return "i64"
  return "f64"
}

function byteSize(type: TypeName): number {
  switch (type) {
    case "u8":
    case "i8": return 1
    case "u16":
    case "i16": return 2
    case "u32":
    case "i32":
    case "f32": return 4
    case "u64":
    case "i64":
    case "f64": return 8
  }
}

const bint: BintFactory = (() => {
  function isArrayIndexProp(prop: string): boolean {
    if (prop === "") return false
    const index = Number(prop)
    return Number.isInteger(index) && index >= 0 && String(index) === prop
  }

  function createState() {
    const types: TypeName[] = []
    const values: Array<number | bigint> = []
    let totalSize = 0

    function push(type: TypeName, value: number | bigint): void {
      types.push(type)
      values.push(value)
      totalSize += 1 + byteSize(type)
    }

    function add(num: number): BintInstance {
      const type = identifyBestType(num)
      push(type, type === "u64" || type === "i64" ? BigInt(num) : num)
      return proxy
    }

    function toBuffer(): ArrayBuffer {
      const buffer = new ArrayBuffer(totalSize)
      const view = new DataView(buffer)

      let offset = 0

      for (let i = 0; i < types.length; i++) {
        const type = types[i]
        const value = values[i]

        view.setUint8(offset, typeIds[type])
        offset += 1

        switch (type) {
          case "u8": view.setUint8(offset, value as number); break
          case "i8": view.setInt8(offset, value as number); break
          case "u16": view.setUint16(offset, value as number, true); break
          case "i16": view.setInt16(offset, value as number, true); break
          case "u32": view.setUint32(offset, value as number, true); break
          case "i32": view.setInt32(offset, value as number, true); break
          case "f32": view.setFloat32(offset, value as number, true); break
          case "u64": view.setBigUint64(offset, value as bigint, true); break
          case "i64": view.setBigInt64(offset, value as bigint, true); break
          case "f64": view.setFloat64(offset, value as number, true); break
        }

        offset += byteSize(type)
      }

      return buffer
    }

    const proxy = new Proxy(add as BintInstance, {
      apply(_, __, args) {
        return add(args[0])
      },

      get(target, prop) {
        if (prop === "toBuffer") return toBuffer

        if (typeof prop === "string" && isArrayIndexProp(prop)) {
          const index = Number(prop)
          return values[index]
        }

        return Reflect.get(target, prop)
      }
    })

    return { proxy, push }
  }

  function create(): BintInstance {
    return createState().proxy
  }

  create.fromBuffer = function(buffer: ArrayBuffer): BintInstance {
    const view = new DataView(buffer)
    const state = createState()
    let offset = 0

    while (offset < buffer.byteLength) {
      const typeId = view.getUint8(offset++)
      const type = idToType[typeId]
      if (!type) throw new Error("Invalid type id")
      const size = byteSize(type)
      if (offset + size > buffer.byteLength) {
        throw new Error("Invalid buffer length")
      }

      let value: number | bigint

      switch (type) {
        case "u8": value = view.getUint8(offset); break
        case "i8": value = view.getInt8(offset); break
        case "u16": value = view.getUint16(offset, true); break
        case "i16": value = view.getInt16(offset, true); break
        case "u32": value = view.getUint32(offset, true); break
        case "i32": value = view.getInt32(offset, true); break
        case "f32": value = view.getFloat32(offset, true); break
        case "u64": value = view.getBigUint64(offset, true); break
        case "i64": value = view.getBigInt64(offset, true); break
        case "f64": value = view.getFloat64(offset, true); break
      }

      offset += size
      state.push(type, value)
    }

    return state.proxy
  }

  return create
})()

export default bint
