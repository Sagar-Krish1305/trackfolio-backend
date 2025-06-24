
export function mean(arr) {
  return arr.reduce((prev, curr) => (curr += prev), 0) / arr.length;
}

export function calculateCovarience(log_return1, log_return2) {
  const N = log_return1.length;
  let cov = 0;
  const mean1 = mean(log_return1);
  const mean2 = mean(log_return2);
  for (let i = 0; i < N; i++) {
    cov += (log_return1[i] - mean1) * (log_return2[i] - mean2);
  }

  return cov / (N - 1);
}

export function getLogReturnsFromBarJSON(barArray) {
  const logReturns = [];

  for (let i = 1; i < barArray.length; i++) {
    const prevClose = barArray[i - 1].c;
    const currClose = barArray[i].c;

    if (prevClose && currClose) {
      const logReturn = Math.log(currClose / prevClose);
      logReturns.push(logReturn);
    }
  }

  return logReturns;
}