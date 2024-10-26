import mqtt from "mqtt";
import { BRIGHTNESS_COMMAND_TOPIC, BRIGHTNESS_STATE_TOPIC, COMMAND_TOPIC, CONFIG_TOPIC, DEVICE_INFO, OFF, ON, STATE_TOPIC } from "./constants.js";
const client = mqtt.connect("mqtt://test.mosquitto.org", {
  clientId: DEVICE_INFO.unique_id,
  // username: "rrda",
  // password: "rrda"
});

import {on, off, dim} from './rrda.js'

client.on("connect", () => {
  client.subscribe("homeassistant/status", (err) => {
    client.publish(CONFIG_TOPIC, JSON.stringify(DEVICE_INFO));
  });
  client.publish(CONFIG_TOPIC, JSON.stringify(DEVICE_INFO));
    client.publish(STATE_TOPIC, ON);
    client.publish(BRIGHTNESS_STATE_TOPIC, '100');
  client.subscribe(COMMAND_TOPIC);
  client.subscribe(BRIGHTNESS_COMMAND_TOPIC);
});

client.on("message", (topic, message) => {
  // message is Buffer
  console.log({topic});

  const payload = message.toString();
  console.log({payload});

  if (topic === "homeassistant/status" && message.toString() === "online") {
    client.publish(CONFIG_TOPIC, JSON.stringify(DEVICE_INFO));
    client.publish(STATE_TOPIC, ON);
    client.publish(BRIGHTNESS_STATE_TOPIC, '100');
  } else if (topic === COMMAND_TOPIC) {
    if (payload === ON) {
      // on()
      client.publish(STATE_TOPIC, ON);
    } else {
      // off()
      client.publish(STATE_TOPIC, OFF);
    }
  } else if (topic === BRIGHTNESS_COMMAND_TOPIC) {
    // dim(parseInt(payload));
    client.publish(BRIGHTNESS_STATE_TOPIC, payload);
  }
});
