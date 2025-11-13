onst { createLogger } = require("../utils/logger");

/**
* Processes records in batches of given size using the provided async handler.
* @param {Array<any>} records
* @param {number} batchSize
* @param {(batch: any[], batchIndex: number) => Promise<void>} handler
* @param {object} [options]
*/
async function processInBatches(records, batchSize, handler, options = {}) {
const logger = options.logger || createLogger("BatchHandler");

if (!Array.isArray(records)) {
throw new Error("records must be an array");
}
if (!Number.isInteger(batchSize) || batchSize <= 0) {
throw new Error("batchSize must be a positive integer");
}
if (typeof handler !== "function") {
throw new Error("handler must be a function");
}

const total = records.length;
if (total === 0) {
logger.warn("No records provided for batch processing");
return;
}

logger.info("Starting batch processing", { total, batchSize });

let batchIndex = 0;
for (let i = 0; i < total; i += batchSize) {
const batch = records.slice(i, i + batchSize);
logger.info("Processing batch", {
batchIndex,
batchSize: batch.length,
progress: `${Math.min(i + batch.length, total)}/${total}`
});

try {
await handler(batch, batchIndex);
} catch (error) {
logger.error("Batch handler failed", error);
// Decide whether to continue or stop.
// Here we stop to avoid silent data loss.
throw error;
}

batchIndex += 1;
}

logger.info("Batch processing complete", { totalBatches: batchIndex });
}

module.exports = {
processInBatches
};