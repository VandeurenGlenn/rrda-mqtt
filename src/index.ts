import mqtt from 'mqtt'
import { env } from 'process'
import { RRDADevice } from './rrda.js'
import {
  AVAILABILITY_TOPIC,
  BRIGHTNESS_COMMAND_TOPIC,
  BRIGHTNESS_STATE_TOPIC,
  COMMAND_TOPIC,
  CONFIG_TOPIC,
  DEVICE_INFO,
  DEVICE_TRACKER_AVAILABILITY_TOPIC,
  DEVICE_TRACKER_CONFIG_TOPIC,
  DEVICE_TRACKER_STATE_TOPIC,
  IP,
  OFF,
  ON,
  STATE_TOPIC,
  TRACKER_INFO
} from './constants.js'
import { readState, writeState } from './helpers.js'

const state = await readState()

const device = new RRDADevice()

const client = mqtt.connect(env.MQTTBROKER ?? 'mqtt://test.mosquitto.org', {
  username: env.USERNAME,
  password: env.PASSWORD
})

client.on('connect', () => {
  client.subscribe('homeassistant/status', (err) => {
    client.publish(DEVICE_TRACKER_CONFIG_TOPIC, JSON.stringify(TRACKER_INFO))
    client.publish(DEVICE_TRACKER_AVAILABILITY_TOPIC, 'online')
    client.publish(CONFIG_TOPIC, JSON.stringify(DEVICE_INFO))
    client.publish(AVAILABILITY_TOPIC, 'online')
    client.publish(DEVICE_TRACKER_STATE_TOPIC, 'home')
    client.publish(BRIGHTNESS_STATE_TOPIC, state.brightness.toString())
    if (state.on) {
      client.publish(STATE_TOPIC, ON)
    } else {
      client.publish(STATE_TOPIC, OFF)
    }
  })
  client.subscribe(COMMAND_TOPIC)
  client.subscribe(BRIGHTNESS_COMMAND_TOPIC)
})

client.on('message', (topic, message) => {
  console.log('message', topic, message.toString())
  const payload = message.toString()

  if (topic === 'homeassistant/status' && message.toString() === 'online') {
    client.publish(CONFIG_TOPIC, JSON.stringify(DEVICE_INFO))
    client.publish(DEVICE_TRACKER_CONFIG_TOPIC, JSON.stringify(TRACKER_INFO))
    client.publish(DEVICE_TRACKER_AVAILABILITY_TOPIC, 'online')
    client.publish(DEVICE_TRACKER_STATE_TOPIC, 'home')
    client.publish(AVAILABILITY_TOPIC, 'online')
    client.publish(BRIGHTNESS_STATE_TOPIC, state.brightness.toString())
    if (state.on) {
      client.publish(STATE_TOPIC, ON)
    } else {
      client.publish(STATE_TOPIC, OFF)
    }
  } else if (topic === COMMAND_TOPIC) {
    if (payload === ON) {
      state.on = true
      device.on()
      client.publish(STATE_TOPIC, ON)
    } else {
      state.on = false
      device.off()
      client.publish(STATE_TOPIC, OFF)
    }
    writeState(state)
  } else if (topic === BRIGHTNESS_COMMAND_TOPIC) {
    state.brightness = parseInt(payload)
    device.dim(state.brightness)
    client.publish(BRIGHTNESS_STATE_TOPIC, payload)
    writeState(state)
  }
})

for (const signal of ['SIGINT', 'SIGTERM', 'SIGQUIT']) {
  process.on(signal, () => {
    client.publish(AVAILABILITY_TOPIC, 'offline')
    client.publish(DEVICE_TRACKER_AVAILABILITY_TOPIC, 'offline')
    setTimeout(() => {
      client.end()
      process.exit()
    }, 200)
  })
}
