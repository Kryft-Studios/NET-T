/**
 * @packageDocumentation
 */

/***/
export default function bint(){
    let buckets = {
        u8: new Uint8Array(),
        u16: new Uint16Array(),
        u32: new Uint32Array(),
        u64: new BigUint64Array(),
        i8: new Int8Array(),
        i16: new Int16Array(),
        i32: new Int32Array(),
        i64: new BigInt64Array(),
        f32: new Float32Array(),
        f64: new Float64Array(),
        removeUntouched: ()=>{
            let a = []
            for(const type of (Object.keys(buckets).filter(a=>a!=="removeUntouched"))){
                if(type.length!==0){
                    a.push(type)
                }
            }
            return a;
        }
    }
    let indexManager: any = []
    indexManager.prototype.getValue = function (index:number){
        
    }
    function returnVariable(){}
}