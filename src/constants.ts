import { networkInterfaces } from 'os'

// rpi zero has only wifi interface so we can safely assume that the mac address is the wifi mac address
const networkInterface = networkInterfaces()['wlan0']?.[0]

export const IP = networkInterface?.address || '127.0.0.1'

export const MAC = networkInterface?.mac

export const PERCENTAGES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]

export const STATE_TOPIC = 'homeassistant/pond/light/status'

export const COMMAND_TOPIC = 'homeassistant/pond/light/set'

export const BRIGHTNESS_STATE_TOPIC = 'homeassistant/pond/brightness/status'

export const BRIGHTNESS_COMMAND_TOPIC = 'homeassistant/pond/brightness/set'

export const CONFIG_TOPIC = 'homeassistant/light/pond/config'

export const ON = 'ON'

export const OFF = 'OFF'

export const AVAILABILITY_TOPIC = 'homeassistant/pond/light/availability'

export const DEVICE_INFO = {
  name: 'rrda/pond',
  device_class: 'light',
  brightness: true,
  state_topic: STATE_TOPIC,
  availability_topic: AVAILABILITY_TOPIC,
  command_topic: COMMAND_TOPIC,
  brightness_state_topic: BRIGHTNESS_STATE_TOPIC,
  brightness_command_topic: BRIGHTNESS_COMMAND_TOPIC,
  config_topic: CONFIG_TOPIC,
  payload_on: ON,
  payload_off: OFF,
  unique_id: MAC,
  brightness_scale: 100,
  device: {
    connections: [['mac', MAC]],
    identifiers: ['RRDA'],
    manufacturer: 'Dimac IS&H Solutions',
    model: 'RRDA-001 (by ION)',
    name: 'Pond',
    hw_version: '1.0.0',
    sw_version: '1.0.0',
    via_device: MAC
  },
  retain: true
}
