import { open, writeFile } from 'fs/promises'

export const readState = async () => {
  let state: { on: boolean; brightness: number } = { on: false, brightness: 100 }

  try {
    let fd = await open('./state.json')
    state = JSON.parse(await fd.readFile({ encoding: 'utf-8' }))
    await fd.close()
  } catch (error) {
    await writeFile('./state.json', JSON.stringify(state))
  }
  return state
}

export const writeState = async (state: { on: boolean; brightness: number }) => {
  await writeFile('./state.json', JSON.stringify(state))
}
