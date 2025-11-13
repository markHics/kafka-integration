onst { Kafka, logLevel } = require("kafkajs");
const { createLogger } = require("../utils/logger");

const DEFAULT_CLIENT_ID = "kafka-integration-client";

/**
* Wraps a KafkaJS producer with a simple interface and logging.
*/
function createKafkaProducer(kafkaConfig, logger = createLogger("KafkaProducer")) {
if (!kafkaConfig || !Array.isArray(kafkaConfig.brokers) || kafkaConfig.brokers.length === 0) {
throw new Error("kafkaConfig.brokers must be a non-empty array");
}

const kafka = new Kafka({
clientId: kafkaConfig.clientId || DEFAULT_CLIENT_ID,
brokers: kafkaConfig.brokers,
ssl: kafkaConfig.ssl || false,
sasl: kafkaConfig.sasl
? {
mechanism: kafkaConfig.sasl.mechanism || "plain",
username: kafkaConfig.sasl.username,
password: kafkaConfig.sasl.password
}
: undefined,
logLevel: logLevel.NOTHING
});

const producer = kafka.producer({
allowAutoTopicCreation: true
});

let isConnected = false;

async function connect() {
if (isConnected) {
logger.debug("Producer already connected");
return;
}

try {
logger.info("Connecting Kafka producer...", {
brokers: kafkaConfig.brokers
});
await producer.connect();
isConnected = true;
logger.info("Kafka producer connected");
} catch (error) {
logger.error("Failed to connect Kafka producer", error);
throw error;
}
}

async function disconnect() {
if (!isConnected) return;
try {
logger.info("Disconnecting Kafka producer...");
await producer.disconnect();
isConnected = false;
logger.info("Kafka producer disconnected");
} catch (error) {
logger.error("Failed to disconnect Kafka producer", error);
// Don't rethrow on disconnect; app is shutting down anyway.
}
}

/**
* Sends a batch of messages to a topic.
* @param {string} topic
* @param {Array<object|string>} messages
*/
async function sendBatch(topic, messages) {
if (!topic) {
throw new Error("Topic is required to send messages");
}

if (!Array.isArray(messages) || messages.length === 0) {
logger.warn("sendBatch called with empty messages array");
return;
}

const payload = messages.map((msg, index) => {
const value = typeof msg === "string" ? msg : JSON.stringify(msg);
return {
key: msg && msg.id ? String(msg.id) : undefined,
value,
headers: {
"x-batch-index": String(index)
}
};
});

try {
logger.info(`Sending batch of ${messages.length} message(s)`, { topic });
const result = await producer.send({
topic,
messages: payload
});
logger.info("Kafka batch send successful", { result });
} catch (error) {
logger.error("Kafka batch send failed", error);
throw error;
}
}

return {
connect,
disconnect,
sendBatch
};
}

module.exports = {
createKafkaProducer
};