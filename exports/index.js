import mqtt from 'mqtt';
import { env } from 'process';
import gpiod from 'node-libgpiod';
import { networkInterfaces } from 'os';
import { open, writeFile } from 'fs/promises';
import { execSync, exec } from 'child_process';
import { CronJob } from 'cron';
import dotenv from 'dotenv';

// rpi zero has only wifi interface so we can safely assume that the mac address is the wifi mac address
const networkInterface = networkInterfaces()['wlan0']?.[0];
networkInterface?.address || '127.0.0.1';
const MAC = networkInterface?.mac;
const PERCENTAGES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
const ON = 'ON';
const OFF = 'OFF';
const DEVICE_INFO = {
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
};
const UPDATE_INFO = {
    name: 'pond update',
    device_class: 'update',
    platform: 'update',
    config_topic: 'homeassistant/update/pond/config',
    state_topic: 'homeassistant/pond/update/status',
    latest_version_topic: 'homeassistant/pond/update/latest',
    command_topic: 'homeassistant/pond/update/update',
    availability_topic: 'homeassistant/pond/update/availability',
    unique_id: `${MAC}-update`,
    device: DEVICE_INFO.device
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

const getSystemInfo = () => {
    const input = execSync('cat /etc/os-release').toString().split('=');
    const info = {};
    for (let i = 0; i < input.length; i += 2) {
        info[input[i]] = input[i + 1];
    }
    return info;
};
const generateVersion = () => {
    const date = new Date();
    const system = getSystemInfo();
    const kernel = execSync('uname -r').toString().trim();
    return `${system['ID']} ${system['VERSION']}-${kernel}@${date.getFullYear()}.${date.getMonth()}.${date.getDate()}`;
};
const readState = async () => {
    let state = {
        on: false,
        brightness: 100,
        version: generateVersion(),
        latestVersion: generateVersion()
    };
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
const upgrade = () => new Promise((resolve, reject) => {
    const child = exec('sudo apt upgrade -y');
    child.stdout?.on('data', (data) => {
        console.log(data);
        if (data.includes('apt list --upgradable')) {
            resolve();
            // child.stdin?.write('Y\n')
        }
    });
    child.stderr?.on('data', console.error);
});
const update$1 = () => new Promise((resolve, reject) => {
    const child = exec('sudo apt update -y');
    child.stdout?.on('data', async (data) => {
        console.log(data);
        if (data.includes('apt list --upgradable')) {
            resolve();
            // child.stdin?.write('Y\n')
        }
        else if (data.includes('All packages are up to date')) {
            resolve();
        }
    });
    child.stderr?.on('data', console.error);
});
const checkForUpdates = async () => {
    await update$1();
    const updates = execSync('apt list --upgradable')
        .toString()
        .split('\n')
        .filter((line) => line.includes('/'));
    const list = {};
    for (const update of updates) {
        const [packageName, version] = update.split('/');
        list[packageName] = version.split(' ')[0];
    }
    return list;
};

dotenv.config();
const state = await readState();
const device = new RRDADevice();
const client = mqtt.connect(env.MQTTBROKER ?? 'mqtt://test.mosquitto.org', {
    username: env.USERNAME,
    password: env.PASSWORD
});
const publishAvailability = (state) => {
    for (const topic of [UPDATE_INFO.availability_topic, DEVICE_INFO.availability_topic])
        client.publish(topic, state);
};
const publishConfig = () => {
    for (const config of [UPDATE_INFO, DEVICE_INFO])
        client.publish(config.config_topic, JSON.stringify(config));
};
const publishState = () => {
    client.publish(DEVICE_INFO.brightness_state_topic, state.brightness.toString());
    client.publish(DEVICE_INFO.state_topic, state.on ? ON : OFF);
};
const update = async () => {
    await upgrade();
    state.version = state.latestVersion;
    writeState(state);
    client.publish(UPDATE_INFO.state_topic, state.version);
    client.publish(UPDATE_INFO.latest_version_topic, state.latestVersion);
};
client.on('connect', () => {
    client.subscribe('homeassistant/status', (err) => {
        publishConfig();
        publishAvailability('online');
        publishState();
    });
    client.subscribe(DEVICE_INFO.command_topic);
    client.subscribe(DEVICE_INFO.brightness_command_topic);
    client.subscribe(UPDATE_INFO.command_topic);
});
client.on('message', async (topic, message) => {
    const payload = message.toString();
    if (topic === 'homeassistant/status' && message.toString() === 'online') {
        publishConfig();
        publishAvailability('online');
        publishState();
    }
    else if (topic === DEVICE_INFO.command_topic) {
        if (payload === ON) {
            state.on = true;
            device.on();
            client.publish(DEVICE_INFO.state_topic, ON);
        }
        else {
            state.on = false;
            device.off();
            client.publish(DEVICE_INFO.state_topic, OFF);
        }
        writeState(state);
    }
    else if (topic === DEVICE_INFO.brightness_command_topic) {
        state.brightness = parseInt(payload);
        device.dim(state.brightness);
        client.publish(DEVICE_INFO.brightness_state_topic, payload);
        writeState(state);
    }
    else if (topic === UPDATE_INFO.command_topic) {
        if (payload === 'update') {
            client.publish(UPDATE_INFO.state_topic, 'updating');
            await update();
            // update code here
            client.publish(UPDATE_INFO.state_topic, state.version);
        }
    }
});
for (const signal of ['SIGINT', 'SIGTERM', 'SIGQUIT']) {
    process.on(signal, () => {
        client.publish(DEVICE_INFO.availability_topic, 'offline');
        setTimeout(() => {
            client.end();
            process.exit();
        }, 200);
    });
}
const updateJob = async () => {
    const updates = await checkForUpdates();
    if (updates) {
        state.latestVersion = generateVersion();
        client.publish(UPDATE_INFO.latest_version_topic, state.latestVersion);
        client.publish(UPDATE_INFO.state_topic, 'updates available');
    }
    else
        client.publish(UPDATE_INFO.state_topic, 'no updates available');
};
await updateJob();
new CronJob('0 0 * * *', updateJob);
