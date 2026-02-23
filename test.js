import bint from "./dist/index.js";

function randomNumber() {
  return Math.floor(Math.random() * 100000);
}

function benchmark(count = 100000) {
  console.time("create instance");
  const b = bint();
  console.timeEnd("create instance");

  console.time("push many numbers");
  for (let i = 0; i < count; i++) {
    b(randomNumber());
  }
  console.timeEnd("push many numbers");

  console.time("toBuffer");
  const buf = b.toBuffer();
  console.timeEnd("toBuffer");

  console.time("fromBuffer");
  const nb = bint.fromBuffer(buf);
  console.timeEnd("fromBuffer");

  console.time("spread read");
  let sum = 0;
  for (const x of nb) sum += Number(x);
  console.timeEnd("spread read");

  console.log("sum (just to use data):", sum);
}

benchmark(50000);