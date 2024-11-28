import mqtt from 'mqtt'
import { env } from 'process'
import { RRDADevice } from './rrda.js'
import { DEVICE_INFO, OFF, ON, UPDATE_INFO } from './constants.js'
import { checkForUpdates, readState, upgrade, writeState } from './helpers.js'
import { generateVersion } from './helpers.js'
import { CronJob } from 'cron'
import { execSync } from 'child_process'
import dotenv from 'dotenv'

dotenv.config()

const state = await readState()

const device = new RRDADevice()

const client = mqtt.connect(env.MQTTBROKER ?? 'mqtt://test.mosquitto.org', {
  username: env.USERNAME,
  password: env.PASSWORD
})

const publishAvailability = (state: 'online' | 'offline') => {
  for (const topic of [UPDATE_INFO.availability_topic, DEVICE_INFO.availability_topic]) client.publish(topic, state)
}

const publishConfig = () => {
  for (const config of [UPDATE_INFO, DEVICE_INFO]) client.publish(config.config_topic, JSON.stringify(config))
}

const publishState = () => {
  client.publish(DEVICE_INFO.brightness_state_topic, state.brightness.toString())
  client.publish(DEVICE_INFO.state_topic, state.on ? ON : OFF)
  client.publish(UPDATE_INFO.state_topic, state.version)
}

const update = async () => {
  await upgrade()

  state.version = state.latestVersion
  writeState(state)
  client.publish(UPDATE_INFO.state_topic, state.version)
}

client.on('connect', () => {
  client.subscribe('homeassistant/status', (err) => {
    publishConfig()
    publishAvailability('online')
    publishState()
  })
  client.subscribe(DEVICE_INFO.command_topic)
  client.subscribe(DEVICE_INFO.brightness_command_topic)
  client.subscribe(UPDATE_INFO.command_topic)
})

client.on('message', async (topic, message) => {
  const payload = message.toString()

  if (topic === 'homeassistant/status' && message.toString() === 'online') {
    publishConfig()
    publishAvailability('online')
    publishState()
  } else if (topic === DEVICE_INFO.command_topic) {
    if (payload === ON) {
      state.on = true
      device.on()
      client.publish(DEVICE_INFO.state_topic, ON)
    } else {
      state.on = false
      device.off()
      client.publish(DEVICE_INFO.state_topic, OFF)
    }
    writeState(state)
  } else if (topic === DEVICE_INFO.brightness_command_topic) {
    state.brightness = parseInt(payload)
    device.dim(state.brightness)
    client.publish(DEVICE_INFO.brightness_state_topic, payload)
    writeState(state)
  } else if (topic === UPDATE_INFO.command_topic) {
    await update()
    // update code here
    client.publish(UPDATE_INFO.state_topic, state.version)
  }
})

for (const signal of ['SIGINT', 'SIGTERM', 'SIGQUIT']) {
  process.on(signal, () => {
    client.publish(DEVICE_INFO.availability_topic, 'offline')
    setTimeout(() => {
      client.end()
      process.exit()
    }, 200)
  })
}

const updateJob = async () => {
  const updates = await checkForUpdates()
  if (updates) {
    state.latestVersion = generateVersion()
    client.publish(UPDATE_INFO.latest_version_topic, state.latestVersion)
  }
}

await updateJob()
new CronJob('0 0 * * *', updateJob)
