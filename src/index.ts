import mqtt from 'mqtt'
import { env } from 'process'
import { RRDADevice } from './rrda.js'
import {
  BRIGHTNESS_COMMAND_TOPIC,
  BRIGHTNESS_STATE_TOPIC,
  COMMAND_TOPIC,
  CONFIG_TOPIC,
  DEVICE_INFO,
  OFF,
  ON,
  STATE_TOPIC
} from './constants.js'
import { readState, writeState } from './helpers.js'

const state = await readState()

const device = new RRDADevice()

const client = mqtt.connect(env.MQTTBROKER ?? 'mqtt://test.mosquitto.org', {
  clientId: DEVICE_INFO.unique_id,
  username: env.USERNAME,
  password: env.PASSWORD
})

client.on('connect', () => {
  client.subscribe('homeassistant/status', (err) => {
    client.publish(CONFIG_TOPIC, JSON.stringify(DEVICE_INFO))
  })
  client.subscribe(COMMAND_TOPIC)
  client.subscribe(BRIGHTNESS_COMMAND_TOPIC)
})

client.on('message', (topic, message) => {
  console.log('message', topic, message.toString())
  const payload = message.toString()

  if (topic === 'homeassistant/status' && message.toString() === 'online') {
    client.publish(CONFIG_TOPIC, JSON.stringify(DEVICE_INFO))
    client.publish(STATE_TOPIC, ON)
    client.publish(BRIGHTNESS_STATE_TOPIC, '100')
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
