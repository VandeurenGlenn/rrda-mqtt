import mqtt from 'mqtt';
import { env } from 'process';
import gpiod from 'node-libgpiod';
import { networkInterfaces } from 'os';
import { open, writeFile } from 'fs/promises';

// rpi zero has only wifi interface so we can safely assume that the mac address is the wifi mac address
const MAC = networkInterfaces()['wlan0']?.[0]?.mac;
const PERCENTAGES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
const STATE_TOPIC = 'homeassistant/pond/light/status';
const COMMAND_TOPIC = 'homeassistant/pond/light/set';
const BRIGHTNESS_STATE_TOPIC = 'homeassistant/pond/brightness/status';
const BRIGHTNESS_COMMAND_TOPIC = 'homeassistant/pond/brightness/set';
const CONFIG_TOPIC = 'homeassistant/light/pond/config';
const ON = 'ON';
const OFF = 'OFF';
const AVAILABILITY_TOPIC = 'homeassistant/pond/light/availability';
const DEVICE_INFO = {
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
        identifiers: [MAC, 'RRDA'],
        manufacturer: 'Dimac IS&H Solutions',
        model: 'RRDA-001 (by ION)',
        name: 'Pond'
    },
    retain: true
};

const { Chip, Line } = gpiod;
const bindings = [5, 10, 20, 30, 50];
const write = (line, state) => line.setValue(state);
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
const byFive = (percentage) => {
    return PERCENTAGES.reduce((p, c) => {
        if (c <= percentage)
            return c;
        else
            return p;
    }, 0);
};
class RRDADevice {
    chip;
    lines = {};
    devices = [];
    constructor() {
        this.chip = new Chip(0);
        this.lines = {
            5: new Line(this.chip, 26),
            10: new Line(this.chip, 6),
            20: new Line(this.chip, 5),
            30: new Line(this.chip, 22),
            50: new Line(this.chip, 27)
        };
        this.devices = [12, 20, 21].map((pin) => new Line(this.chip, pin));
        for (const line of Object.values(this.lines)) {
            line.requestOutputMode();
        }
        for (const device of this.devices) {
            device.requestOutputMode();
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
    ifnotPercentage(percentage) {
        if (!Array.isArray(percentage))
            percentage = [percentage];
        const off = bindings.reduce((p, c) => {
            if (percentage.indexOf(c) === -1)
                p.push(c);
            return p;
        }, []);
        for (const value of off)
            write(this.lines[value], 0);
        if (percentage[0] !== 0)
            for (const value of percentage)
                write(this.lines[value], 1);
    }
    /**
     * @param percentage number
     * @returns void
     *
     * @example
     * dim(5) // 5
     */
    dim(percentage) {
        percentage = byFive(percentage);
        if (percentage === 0) {
            return this.ifnotPercentage(0);
        }
        else if (percentage === 5 || percentage === 10 || percentage === 20 || percentage === 30 || percentage === 50) {
            return this.ifnotPercentage(percentage);
        }
        else if (percentage === 15) {
            return this.ifnotPercentage([5, 10]);
        }
        else if (percentage === 25) {
            return this.ifnotPercentage([5, 20]);
        }
        else if (percentage === 35) {
            return this.ifnotPercentage([5, 30]);
        }
        else if (percentage === 40) {
            return this.ifnotPercentage([10, 30]);
        }
        else if (percentage === 45) {
            return this.ifnotPercentage([5, 10, 30]);
        }
        else if (percentage === 55) {
            return this.ifnotPercentage([5, 50]);
        }
        else if (percentage === 60) {
            return this.ifnotPercentage([10, 50]);
        }
        else if (percentage === 65) {
            return this.ifnotPercentage([5, 10, 50]);
        }
        else if (percentage === 70) {
            return this.ifnotPercentage([20, 50]);
        }
        else if (percentage === 75) {
            return this.ifnotPercentage([5, 20, 50]);
        }
        else if (percentage === 80) {
            return this.ifnotPercentage([30, 50]);
        }
        else if (percentage === 85) {
            return this.ifnotPercentage([5, 30, 50]);
        }
        else if (percentage === 90) {
            return this.ifnotPercentage([10, 30, 50]);
        }
        else if (percentage === 95) {
            return this.ifnotPercentage([5, 10, 30, 50]);
        }
        else if (percentage === 100) {
            return this.ifnotPercentage([20, 30, 50]);
        }
    }
    on(device = 1, percentage) {
        if (percentage)
            this.dim(percentage);
        else
            write(this.devices[Number(device) - 1], 1);
        write(this.devices[Number(device) - 1], 1);
    }
    off(device = 1) {
        write(this.devices[Number(device) - 1], 0);
    }
}

const readState = async () => {
    let state = { on: false, brightness: 100 };
    try {
        let fd = await open('./state.json');
        state = JSON.parse(await fd.readFile({ encoding: 'utf-8' }));
        await fd.close();
    }
    catch (error) {
        await writeFile('./state.json', JSON.stringify(state));
    }
    return state;
};
const writeState = async (state) => {
    await writeFile('./state.json', JSON.stringify(state));
};

const state = await readState();
const device = new RRDADevice();
const client = mqtt.connect(env.MQTTBROKER ?? 'mqtt://test.mosquitto.org', {
    clientId: DEVICE_INFO.unique_id,
    username: env.USERNAME,
    password: env.PASSWORD
});
client.on('connect', () => {
    client.subscribe('homeassistant/status', (err) => {
        client.publish(CONFIG_TOPIC, JSON.stringify(DEVICE_INFO));
        client.publish(AVAILABILITY_TOPIC, 'online');
        client.publish(BRIGHTNESS_STATE_TOPIC, state.brightness.toString());
        if (state.on) {
            client.publish(STATE_TOPIC, ON);
        }
        else {
            client.publish(STATE_TOPIC, OFF);
        }
    });
    client.subscribe(COMMAND_TOPIC);
    client.subscribe(BRIGHTNESS_COMMAND_TOPIC);
});
client.on('message', (topic, message) => {
    console.log('message', topic, message.toString());
    const payload = message.toString();
    if (topic === 'homeassistant/status' && message.toString() === 'online') {
        client.publish(CONFIG_TOPIC, JSON.stringify(DEVICE_INFO));
        client.publish(AVAILABILITY_TOPIC, 'online');
        client.publish(BRIGHTNESS_STATE_TOPIC, state.brightness.toString());
        if (state.on) {
            client.publish(STATE_TOPIC, ON);
        }
        else {
            client.publish(STATE_TOPIC, OFF);
        }
    }
    else if (topic === COMMAND_TOPIC) {
        if (payload === ON) {
            state.on = true;
            device.on();
            client.publish(STATE_TOPIC, ON);
        }
        else {
            state.on = false;
            device.off();
            client.publish(STATE_TOPIC, OFF);
        }
        writeState(state);
    }
    else if (topic === BRIGHTNESS_COMMAND_TOPIC) {
        state.brightness = parseInt(payload);
        device.dim(state.brightness);
        client.publish(BRIGHTNESS_STATE_TOPIC, payload);
        writeState(state);
    }
});
process.on('beforeExit', () => {
    client.publish(AVAILABILITY_TOPIC, 'offline');
    client.end();
});
