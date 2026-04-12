function calculate(F, M) {
  const W1 = 60 * 25.4; // 1524
  const N1 = 3;
  const targetShutter1 = 18.375 * 25.4; // 466.725
  const s1 = (W1 - F - (N1-1)*M) / N1;
  
  const W2 = 36.375 * 25.4; // 923.925
  const N2 = 2;
  const targetShutter2 = 16.5 * 25.4; // 419.1
  const s2 = (W2 - F - (N2-1)*M) / N2;
  
  const W3 = 431;
  const N3 = 1;
  const targetShutter3 = 393;
  const s3 = (W3 - F - (N3-1)*M) / N3;
  
  return {
    s1: s1 - targetShutter1,
    s2: s2 - targetShutter2,
    s3: s3 - targetShutter3
  };
}

let bestF, bestM, minError = Infinity;
for (let F = 10; F < 100; F+=0.5) {
  for (let M = 10; M < 100; M+=0.5) {
    const err = calculate(F, M);
    const sumError = Math.abs(err.s1) + Math.abs(err.s2) + Math.abs(err.s3);
    if (sumError < minError) {
      minError = sumError;
      bestF = F;
      bestM = M;
    }
  }
}
console.log(`Best Fit: F = ${bestF}mm, M = ${bestM}mm`);
const err = calculate(bestF, bestM);
console.log(`Errors (mm): N=3 -> ${err.s1.toFixed(2)}, N=2 -> ${err.s2.toFixed(2)}, N=1 -> ${err.s3.toFixed(2)}`);

// Exact fit for N=2 and N=3
// F + 2M = 4.875 * 25.4 = 123.825
// F + M = 3.375 * 25.4 = 85.725
const M_exact = 123.825 - 85.725;
const F_exact = 85.725 - M_exact;
console.log(`Exact Fit for N=2, N=3: F = ${F_exact}mm, M = ${M_exact}mm`);
