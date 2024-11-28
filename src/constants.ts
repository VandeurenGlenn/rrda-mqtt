import { networkInterfaces, platform } from 'os'

// rpi zero has only wifi interface so we can safely assume that the mac address is the wifi mac address
const networkInterface = networkInterfaces()['wlan0']?.[0]

export const IP = networkInterface?.address || '127.0.0.1'

export const MAC = networkInterface?.mac

export const PERCENTAGES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]

export const ON = 'ON'

export const OFF = 'OFF'

export const DEVICE_INFO = {
  name: 'pond light',
  class_device: 'light',
  brightness: true,
  state_topic: 'homeassistant/pond/light/status',
  availability_topic: 'homeassistant/pond/light/availability',
  command_topic: 'homeassistant/pond/light/set',
  brightness_state_topic: 'homeassistant/pond/brightness/status',
  brightness_command_topic: 'homeassistant/pond/brightness/set',
  config_topic: 'homeassistant/light/pond/config',
  payload_on: ON,
  payload_off: OFF,
  unique_id: `${MAC}-light`,
  brightness_scale: 100,
  device: {
    connections: [['mac', MAC]],
    identifiers: ['RRDA'],
    manufacturer: 'Dimac IS&H Solutions',
    model: 'RRDA-001 (by ION)',
    name: 'Pond Pi',
    hw_version: '1.0.0',
    sw_version: '1.0.0',
    via_device: MAC
  },
  retain: true
}

export const UPDATE_INFO = {
  name: 'pond update',
  platform: 'update',
  icon: 'mdi:update',
  config_topic: 'homeassistant/update/pond/config',
  state_topic: 'homeassistant/pond/update/status',
  latest_version_topic: 'homeassistant/pond/update/latest',
  command_topic: 'homeassistant/pond/update/install',
  availability_topic: 'homeassistant/pond/update/availability',
  install_payload: 'install',
  unique_id: `${MAC}-update`,
  device: DEVICE_INFO.device
}
