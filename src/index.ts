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
  OFF,
  ON,
  STATE_TOPIC
} from './constants.js'
import { readState, writeState } from './helpers.js'

import dotenv from 'dotenv'

dotenv.config()

const state = await readState()

const device = new RRDADevice()

let haStatus: string

let client = mqtt.connect(env.MQTTBROKER ?? 'mqtt://test.mosquitto.org', {
  clientId: DEVICE_INFO.unique_id,
  username: env.USERNAME,
  password: env.PASSWORD
})

client.on('connect', () => {
  client.subscribe('homeassistant/status', (err) => {
    client.publish(CONFIG_TOPIC, JSON.stringify(DEVICE_INFO))
    client.publish(AVAILABILITY_TOPIC, 'online')
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

const onmessage = (client) => {
  client.on('message', (topic, message) => {
    const payload = message.toString()
    if (topic === 'homeassistant/status' && message.toString() === 'offline') {
      haStatus = 'offline'
      return
    }

    if (topic === 'homeassistant/status' && message.toString() === 'online') {
      if (haStatus === 'offline') {
        haStatus = 'online'
        client = mqtt.connect(env.MQTTBROKER ?? 'mqtt://test.mosquitto.org', {
          clientId: DEVICE_INFO.unique_id,
          username: env.USERNAME,
          password: env.PASSWORD
        })
        client.subscribe('homeassistant/status')
        client.subscribe(COMMAND_TOPIC)
        client.subscribe(BRIGHTNESS_COMMAND_TOPIC)
        onmessage(client)
        return
      }
      client.publish(CONFIG_TOPIC, JSON.stringify(DEVICE_INFO))
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
}

onmessage(client)

for (const signal of ['SIGINT', 'SIGTERM', 'SIGQUIT']) {
  process.on(signal, () => {
    client.publish(AVAILABILITY_TOPIC, 'offline')
    setTimeout(() => {
      client.end()
      process.exit()
    }, 200)
  })
}
