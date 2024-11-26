import gpiod from 'node-libgpiod'
import { PERCENTAGES } from './constants.js'

const { Chip, Line } = gpiod

const bindings = [5, 10, 20, 30, 50]

const write = (line: gpiod.Line, state: 1 | 0) => line.setValue(state)

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
    if (c <= percentage) return c
    else return p
  }, 0)
}
export class RRDADevice {
  chip: gpiod.Chip
  lines: { [index: number]: gpiod.Line } = {}
  devices: gpiod.Line[] = []

  constructor() {
    this.chip = new Chip(0)

    this.lines = {
      5: new Line(this.chip, 26),
      10: new Line(this.chip, 6),
      20: new Line(this.chip, 5),
      30: new Line(this.chip, 22),
      50: new Line(this.chip, 27)
    }

    this.devices = [12, 20, 21].map((pin) => new Line(this.chip, pin))

    for (const line of Object.values(this.lines)) {
      line.requestOutputMode()
    }

    for (const device of this.devices) {
      device.requestOutputMode()
    }
  }

  // TODO: gpio and devices should be setup by device config

  /**
   * Turn off all devices except the ones in the percentage array
   * @param percentage number
   *
   * @example
   * ifnotPercentage(5) // 10, 20, 30, 50
   */
  ifnotPercentage(percentage: number | number[]) {
    if (!Array.isArray(percentage)) percentage = [percentage]

    const off = bindings.reduce((p, c) => {
      if (percentage.indexOf(c) === -1) p.push(c)
      return p
    }, [] as number[])

    for (const value of off) write(this.lines[value], 0)

    if (percentage[0] !== 0) for (const value of percentage) write(this.lines[value], 1)
  }

  /**
   * @param percentage number
   * @returns void
   *
   * @example
   * dim(5) // 5
   */
  dim(percentage: number) {
    percentage = byFive(percentage)
    if (percentage === 0) {
      return this.ifnotPercentage(0)
    } else if (percentage === 5 || percentage === 10 || percentage === 20 || percentage === 30 || percentage === 50) {
      return this.ifnotPercentage(percentage)
    } else if (percentage === 15) {
      return this.ifnotPercentage([5, 10])
    } else if (percentage === 25) {
      return this.ifnotPercentage([5, 20])
    } else if (percentage === 35) {
      return this.ifnotPercentage([5, 30])
    } else if (percentage === 40) {
      return this.ifnotPercentage([10, 30])
    } else if (percentage === 45) {
      return this.ifnotPercentage([5, 10, 30])
    } else if (percentage === 55) {
      return this.ifnotPercentage([5, 50])
    } else if (percentage === 60) {
      return this.ifnotPercentage([10, 50])
    } else if (percentage === 65) {
      return this.ifnotPercentage([5, 10, 50])
    } else if (percentage === 70) {
      return this.ifnotPercentage([20, 50])
    } else if (percentage === 75) {
      return this.ifnotPercentage([5, 20, 50])
    } else if (percentage === 80) {
      return this.ifnotPercentage([30, 50])
    } else if (percentage === 85) {
      return this.ifnotPercentage([5, 30, 50])
    } else if (percentage === 90) {
      return this.ifnotPercentage([10, 30, 50])
    } else if (percentage === 95) {
      return this.ifnotPercentage([5, 10, 30, 50])
    } else if (percentage === 100) {
      return this.ifnotPercentage([20, 30, 50])
    }
  }

  on(device: number = 1, percentage?: number) {
    if (percentage) this.dim(percentage)
    else write(this.devices[Number(device) - 1], 1)
    write(this.devices[Number(device) - 1], 1)
  }

  off(device: number = 1) {
    write(this.devices[Number(device) - 1], 0)
  }
}
