
type TypeName =
  | "Uint8"
  | "Uint16"
  | "Uint32"
  | "BigUint64"
  | "Int8"
  | "Int16"
  | "Int32"
  | "BigInt64"
  | "Float32"
  | "Float64";
interface BintInstance {
  (value: number): BintInstance;
  readonly [index: number]: number | bigint;
  readonly length: number;
  at(index: number): number | bigint | undefined;
  values(): IterableIterator<number | bigint>;
  entries(): IterableIterator<[number, number | bigint]>;
  keys(): IterableIterator<number>;
  [Symbol.iterator](): IterableIterator<number | bigint>;
  toBuffer(): ArrayBuffer;
}

interface BintFactory {
  (): BintInstance;
  fromBuffer(buffer: ArrayBuffer): BintInstance;
}


const typeIds: Record<TypeName, number> = {
  Uint8: 1,
  Uint16: 2,
  Uint32: 3,
  BigUint64: 4,
  Int8: 5,
  Int16: 6,
  Int32: 7,
  BigInt64: 8,
  Float32: 9,
  Float64: 10,
};

const idToType: Record<number, TypeName> = {
  1: "Uint8",
  2: "Uint16",
  3: "Uint32",
  4: "BigUint64",
  5: "Int8",
  6: "Int16",
  7: "Int32",
  8: "BigInt64",
  9: "Float32",
  10: "Float64",
};
const F32_MAX = 3.4028234663852886e38;

function identifyBestType(num: number): TypeName {
  if (!Number.isFinite(num)) return "Float64";

  if (!Number.isInteger(num)) {
    if (num >= -F32_MAX && num <= F32_MAX && Math.fround(num) === num) {
      return "Float32";
    }
    return "Float64";
  }
  let numIsSafe = Number.isSafeInteger(num)
  if (num >= 0) {
    if (num <= 0xff) return "Uint8";
    if (num <= 0xffff) return "Uint16";
    if (num <= 0xffffffff) return "Uint32";
    if (numIsSafe) return "BigUint64";
    return "Float64";
  }

  if (num >= -0x80) return "Int8";
  if (num >= -0x8000) return "Int16";
  if (num >= -0x80000000) return "Int32";
  if (numIsSafe) return "BigInt64";
  return "Float64";
}
function byteSize(type: TypeName): number {
  if(type.endsWith("8"))return 1; // Uint8 does NOT meet the requirements for the following operations (Number("t8") will be NaN)
  // the length var
  let len = type.length;
  // the number at the end (for example in Uint32 its 32)
  let number = Number(type.slice(len - 2, len));
  // the multiple of 8 = byte size. therefore for BigUint64 it is 8!
  return number / 8;
}

const bint: BintFactory = (() => {
  function isArrayIndexProp(prop: string): boolean {
    if (prop === "") return false;
    const index = Number(prop);
    return Number.isInteger(index) && index >= 0 && String(index) === prop;
  }

  function createState() {
    const types: TypeName[] = [];
    const values: Array<number | bigint> = [];
    let totalSize = 0;

    function push(type: TypeName, value: number | bigint): void {
      types.push(type);
      values.push(value);
      totalSize += 1 + byteSize(type);
    }

    function add(num: number): BintInstance {
      const type = identifyBestType(num);
      push(
        type,
        type.startsWith("Big") ? BigInt(num) : num,
      );
      return proxy;
    }

    function at(index: number): number | bigint | undefined {
      return values[index < 0 ? values.length + index : index];
    }

    function valuesIterator(): IterableIterator<number | bigint> {
      return values.values();
    }

    function entriesIterator(): IterableIterator<[number, number | bigint]> {
      return values.entries();
    }

    function keysIterator(): IterableIterator<number> {
      return values.keys();
    }

    function toBuffer(): ArrayBuffer {
      const buffer = new ArrayBuffer(totalSize);
      const view = new DataView(buffer);

      let offset = 0;

      for (let i = 0; i < types.length; i++) {
        const type = types[i];
        const value = values[i];

        view.setUint8(offset, typeIds[type]);
        offset += 1;

        let vsset = (view as any)[`set${type}`]
        if (type.endsWith("8")) {
          vsset.call(view, offset, value, true);;
        } else if (type.endsWith("64") && !type.startsWith("F")) {
          vsset.call(view, offset, value, true);;
        } else {
          //try {
          vsset.call(view, offset, value, true);;
          //} catch (e) {
          //  console.log("⚠",value,type,"\n",e)
          //}
        }
        offset += byteSize(type);
      }

      return buffer;
    }
    const proxy = new Proxy(add as BintInstance, {
      apply(_,__, args) {
        return add(args[0]);
      },
      get(target, prop) {
        if (prop === "toBuffer") return toBuffer;
        if (prop === "length") return values.length;
        if (prop === "at") return at;
        if (prop === "values" || prop === Symbol.iterator || prop === Symbol.asyncIterator) return valuesIterator;
        if (prop === "entries") return entriesIterator;
        if (prop === "keys") return keysIterator;

        if (typeof prop === "string" && isArrayIndexProp(prop)) {
          return values[Number(prop)];
        }

        return Reflect.get(target, prop);
      },
    });

    return { proxy, push };
  }

  function create(): BintInstance {
    return createState().proxy;
  }

  create.fromBuffer = function (buffer: ArrayBuffer): BintInstance {
    const view = new DataView(buffer);
    const state = createState();
    let offset = 0;

    while (offset < buffer.byteLength) {
      const typeId = view.getUint8(offset++);
      const type = idToType[typeId];
      if (!type) throw new Error("[@briklab/net-t] Invalid type id");
      const size = byteSize(type);
      if (offset + size > buffer.byteLength) {
        throw new Error("[@briklab/net-t] Invalid buffer length");
      }

      let value: number | bigint;

      value = view[`get${type}`](offset,true)

      offset += size;
      state.push(type, value);
    }

    return state.proxy;
  };

  return create;
})();
export default bint;
