import { Gpio } from 'onoff';
import { PERCENTAGES } from './constants.js';
// TODO: gpio and devices should be setup by device config
const bindings = [5, 10, 20, 30, 50];

const gpios: {[index: number]: Gpio} = {
  5: new Gpio(26, 'out'),
  10: new Gpio(6, 'out'),
  20: new Gpio(5, 'out'),
  30: new Gpio(22, 'out'),
  50: new Gpio(27, 'out'),
}

const devices = [12, 20, 21].map(pin => new Gpio(pin, 'out'))

const write = (gpio: Gpio, state: 1 | 0) => gpio.writeSync(state)

/**
 * Turn off all devices except the ones in the percentage array
 * @param percentage number
 *
 * @example
 * ifnotPercentage(5) // 10, 20, 30, 50
 */
const ifnotPercentage = (percentage: number | number[]) => {
  if (!Array.isArray(percentage)) percentage = [percentage]

  const off = bindings.reduce((p, c) => {
    if (percentage.indexOf(c) === -1) p.push(c);
    return p;
  }, [] as number[])

  for (const value of off) write(gpios[value], 0)

  if (percentage[0] !== 0) for (const value of percentage) write(gpios[value], 1)
}

/**
 *
 * @param percentage number
 * @returns 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 55 | 60 | 65 | 70 | 75 | 80 | 85 | 90 | 95 | 100
 *
 * @example
 * byFive(5) // 5
 * byFive(6) // 10
 * byFive(7) // 10
 * byFive(11) // 15
 */
const byFive = (percentage: number) => {
  return PERCENTAGES.reduce((p, c) => {
    if (c <= percentage) return c;
    else return p;
  }, 0);
};

/**
 * @param percentage number
 * @returns void
 *
 * @example
 * dim(5) // 5
 */
export const dim = (percentage: number) => {
  percentage = byFive(percentage);
  if (percentage === 0) {
    return ifnotPercentage(0)
  } else if (percentage === 5 ||
             percentage === 10 ||
             percentage === 20 ||
             percentage === 30 ||
             percentage === 50) {
    return ifnotPercentage(percentage);
  } else if (percentage === 15) {
    return ifnotPercentage([5, 10]);
  } else if (percentage === 25) {
    return ifnotPercentage([5, 20]);
  } else if (percentage === 35) {
    return ifnotPercentage([5, 30]);
  } else if (percentage === 40) {
    return ifnotPercentage([10, 30]);
  } else if (percentage === 45) {
    return ifnotPercentage([5, 10, 30]);
  } else if (percentage === 55) {
    return ifnotPercentage([5, 50]);
  } else if (percentage === 60) {
    return ifnotPercentage([10, 50]);
  } else if (percentage === 65) {
    return ifnotPercentage([5, 10, 50]);
  } else if (percentage === 70) {
    return ifnotPercentage([20, 50]);
  } else if (percentage === 75) {
    return ifnotPercentage([5, 20, 50]);
  } else if (percentage === 80) {
    return ifnotPercentage([30, 50]);
  } else if (percentage === 85) {
    return ifnotPercentage([5, 30, 50]);
  } else if (percentage === 90) {
    return ifnotPercentage([10, 30, 50]);
  } else if (percentage === 95) {
    return ifnotPercentage([5, 10, 30, 50]);
  } else if (percentage === 100) {
    return ifnotPercentage([20, 30, 50]);
  }
}

/**
 * @param {number} device [1] 1, 2 or 3
 */
export const on = (device = 1) => {
  write(devices[Number(device) - 1], 1)
}

/**
 * @param {number} device [1] 1, 2 or 3
 */
export const off = (device = 1) => {
  write(devices[Number(device) - 1], 0)
}
