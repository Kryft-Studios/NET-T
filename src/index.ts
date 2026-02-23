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

const idToType = Object.fromEntries(
  Object.entries(typeIds).map(([k, v]) => [v, k])
) as Record<number, TypeName>

const caps = {
  u8: { min: 0, max: 255 },
  u16: { min: 0, max: 65535 },
  u32: { min: 0, max: 4294967295 },
  u64: { min: 0n, max: 18446744073709551615n },

  i8: { min: -128, max: 127 },
  i16: { min: -32768, max: 32767 },
  i32: { min: -2147483648, max: 2147483647 },
  i64: { min: -9223372036854775808n, max: 9223372036854775807n },

  f32: { min: -3.4028234663852886e38, max: 3.4028234663852886e38 },
  f64: { min: -Number.MAX_VALUE, max: Number.MAX_VALUE },
} as const

function identifyBestType(num: number): TypeName {
  const isInt = Number.isInteger(num)
  const isNeg = num < 0

  const order: TypeName[] = [
    "u8","u16","u32","u64",
    "i8","i16","i32","i64",
    "f32","f64"
  ]

  for (const type of order) {
    const cap = caps[type]

    if (isNeg && type.startsWith("u")) continue
    if (!isInt && !type.startsWith("f")) continue

    if (type === "u64" || type === "i64") {
      if (!isInt) continue
      const big = BigInt(num)
      if (big >= cap.min && big <= cap.max) return type
      continue
    }

    if (num >= (cap as any).min && num <= (cap as any).max) {
      return type
    }
  }

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

  function create(): BintInstance {
    const buckets: Record<TypeName, any[]> = {
      u8: [], u16: [], u32: [], u64: [],
      i8: [], i16: [], i32: [], i64: [],
      f32: [], f64: [],
    }

    const typeOrder: TypeName[] = []
    const positions: number[] = []

    function add(num: number): BintInstance {
      const type = identifyBestType(num)
      const pos = buckets[type].length

      buckets[type].push(
        type === "u64" || type === "i64"
          ? BigInt(num)
          : num
      )

      typeOrder.push(type)
      positions.push(pos)

      return proxy
    }

    function toBuffer(): ArrayBuffer {
      let total = 0

      for (const type of typeOrder) {
        total += 1
        total += byteSize(type)
      }

      const buffer = new ArrayBuffer(total)
      const view = new DataView(buffer)

      let offset = 0

      for (let i = 0; i < typeOrder.length; i++) {
        const type = typeOrder[i]
        const value = buckets[type][positions[i]]

        view.setUint8(offset, typeIds[type])
        offset += 1

        switch (type) {
          case "u8": view.setUint8(offset, value); break
          case "i8": view.setInt8(offset, value); break
          case "u16": view.setUint16(offset, value, true); break
          case "i16": view.setInt16(offset, value, true); break
          case "u32": view.setUint32(offset, value, true); break
          case "i32": view.setInt32(offset, value, true); break
          case "f32": view.setFloat32(offset, value, true); break
          case "u64": view.setBigUint64(offset, value, true); break
          case "i64": view.setBigInt64(offset, value, true); break
          case "f64": view.setFloat64(offset, value, true); break
        }

        offset += byteSize(type)
      }

      return buffer
    }

    const proxy = new Proxy(add as BintInstance, {
      apply(_, __, args) {
        return add(args[0])
      },

      get(_, prop) {
        if (prop === "toBuffer") return toBuffer

        if (typeof prop === "string" && !isNaN(Number(prop))) {
          const index = Number(prop)
          const type = typeOrder[index]
          return type
            ? buckets[type][positions[index]]
            : undefined
        }

        return undefined
      }
    })

    return proxy
  }

  create.fromBuffer = function(buffer: ArrayBuffer): BintInstance {
    const view = new DataView(buffer)
    let offset = 0
    const instance = create()

    while (offset < buffer.byteLength) {
      const typeId = view.getUint8(offset++)
      const type = idToType[typeId]
      if (!type) throw new Error("Invalid type id")

      let value: any

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

      offset += byteSize(type)
      instance(value)
    }

    return instance
  }

  return create
})()

export default bint