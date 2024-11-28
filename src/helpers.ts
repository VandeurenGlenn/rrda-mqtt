import { open, writeFile } from 'fs/promises'
import { exec, execSync } from 'child_process'

export type State = {
  on: boolean
  brightness: number
  version: string
  latestVersion: string
}

export const generateVersion = () => {
  const date = new Date()
  const kernel = execSync('uname -r').toString().trim()
  return `${kernel}@${date.getFullYear()}.${date.getMonth()}.${date.getDate()}.${date.getHours()}${date.getMinutes()}`
}

export const readState = async () => {
  let state: State = {
    on: false,
    brightness: 100,
    version: generateVersion(),
    latestVersion: generateVersion()
  }

  try {
    let fd = await open('./state.json')
    state = JSON.parse(await fd.readFile({ encoding: 'utf-8' }))
    await fd.close()
  } catch (error) {
    await writeFile('./state.json', JSON.stringify(state))
  }
  return state
}

export const writeState = async (state: State) => {
  await writeFile('./state.json', JSON.stringify(state))
}

export const upgrade = () =>
  new Promise<void>((resolve, reject) => {
    const child = exec('sudo apt upgrade -y')
    child.stdout?.on('data', (data) => {
      console.log(data)
      if (data.includes('apt list --upgradable')) {
        resolve()
        // child.stdin?.write('Y\n')
      }
    })
    child.stderr?.on('data', console.error)
  })

export const update = () =>
  new Promise<void>((resolve, reject) => {
    const child = exec('sudo apt update -y')
    child.stdout?.on('data', async (data) => {
      console.log(data)
      if (data.includes('apt list --upgradable')) {
        resolve()
        // child.stdin?.write('Y\n')
      } else if (data.includes('All packages are up to date')) {
        resolve()
      }
    })
    child.stderr?.on('data', console.error)
  })

export const checkForUpdates = async () => {
  await update()
  const updates = execSync('apt list --upgradable')
    .toString()
    .split('\n')
    .filter((line) => line.includes('/'))

  const list: { [index: string]: string } = {}

  for (const update of updates) {
    const [packageName, version] = update.split('/')
    list[packageName] = version.split(' ')[0]
  }

  return list
}

export const shutdown = () => {
  exec('sudo shutdown -h now')
}

export const reboot = () => {
  exec('sudo reboot -n')
}
