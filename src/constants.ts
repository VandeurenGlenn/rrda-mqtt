import {open, writeFile} from 'fs/promises'
import { mac } from 'address'

let config: {unique_id: string}

try {
  let fd = await open('./config.json')
  config = JSON.parse(await fd.readFile({encoding: 'utf-8'}))
  await fd.close()
} catch (error) {
  config = {
    unique_id: crypto.randomUUID()
  }
  await writeFile('./config.json', JSON.stringify(config))
}

const getMAC = () => new Promise((resolve, reject) => {
  mac((err, addr) => {
    if (err) reject(err)
    resolve(addr)
  })
})

export const CONFIG = config

export const PERCENTAGES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]

export const STATE_TOPIC = "homeassistant/pond/light/status"

export const COMMAND_TOPIC = "homeassistant/pond/light/set"

export const BRIGHTNESS_STATE_TOPIC = "homeassistant/pond/brightness/status"

export const BRIGHTNESS_COMMAND_TOPIC = "homeassistant/pond/brightness/set"

export const CONFIG_TOPIC = "homeassistant/light/pond/config"

export const  ON = "ON"

export const  OFF = "OFF"

export const DEVICE_INFO = {
  "name": "rrda/pond",
  "device_class":"light",
  "brightness": true,
  "state_topic": STATE_TOPIC,
  "command_topic": COMMAND_TOPIC,
  "brightness_state_topic": BRIGHTNESS_STATE_TOPIC,
  "brightness_command_topic": BRIGHTNESS_COMMAND_TOPIC,
  "config_topic": CONFIG_TOPIC,
  "payload_on": ON,
  "payload_off": OFF,
  "unique_id": await getMAC(),
  "brightness_scale": 100,
  "device":{
    "identifiers":[
      "RRDA"
    ],
    "manufacturer":"Dimac IS&H Solutions",
    "model":"RRDA-001 (by ION)",
    "name":"Pond"
  },
  "retain" : true
}
