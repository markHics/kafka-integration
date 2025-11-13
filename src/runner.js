onst path = require("path");
const { createLogger } = require("./utils/logger");
const { createKafkaProducer } = require("./processors/kafka_producer");
const { processInBatches } = require("./processors/batch_handler");

const logger = createLogger("Runner");

/**
* Loads the integration configuration and dataset from sample-input.json.
* In a real deployment this could be replaced by environment-specific config loading.
*/
function loadSampleConfig() {
const inputPath = path.join(__dirname, "..", "data", "sample-input.json");
// require can load JSON files directly
// eslint-disable-next-line global-require, import/no-dynamic-require
const config = require(inputPath);

if (!config.kafkaConfig || !config.kafkaConfig.topic) {
throw new Error("Invalid configuration: kafkaConfig.topic is required");
}
if (!config.batchSize || !Number.isInteger(config.batchSize) || config.batchSize <= 0) {
throw new Error("Invalid configuration: batchSize must be a positive integer");
}

return config;
}

/**
* Filters records by datasetId if a defaultDatasetId is provided.
*/
function selectRecords(records, defaultDatasetId) {
if (!Array.isArray(records)) {
return [];
}

if (!defaultDatasetId) {
return records;
}

return records.filter((record) => record.datasetId === defaultDatasetId);
}

async function main() {
logger.info("Kafka Integration Runner starting...");

let config;
try {
config = loadSampleConfig();
} catch (error) {
logger.error("Failed to load configuration", error);
process.exitCode = 1;
return;
}

const { defaultDatasetId, kafkaConfig, batchSize } = config;
const allRecords = config.records || [];
const records = selectRecords(allRecords, defaultDatasetId);

if (records.length === 0) {
logger.warn("No records found for processing", {
defaultDatasetId
});
return;
}

logger.info("Configuration loaded", {
defaultDatasetId,
topic: kafkaConfig.topic,
brokers: kafkaConfig.brokers,
batchSize,
totalRecords: records.length
});

const producer = createKafkaProducer(kafkaConfig, createLogger("KafkaProducer"));

try {
await producer.connect();

await processInBatches(
records,
batchSize,
async (batch, batchIndex) => {
logger.info("Sending batch to Kafka", {
batchIndex,
batchSize: batch.length
});
await producer.sendBatch(kafkaConfig.topic, batch);
},
{ logger: createLogger("BatchHandler") }
);

logger.info("All records processed successfully");
} catch (error) {
logger.error("Runner encountered an error", error);
process.exitCode = 1;
} finally {
await producer.disconnect();
logger.info("Kafka Integration Runner finished");
}
}

// Run only when executed directly.
if (require.main === module) {
// eslint-disable-next-line no-console
main().catch((error) => {
logger.error("Fatal error in main()", error);
process.exitCode = 1;
});
}

module.exports = {
main
};