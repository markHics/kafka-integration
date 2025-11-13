onst LEVELS = ["debug", "info", "warn", "error"];

/**
 * Very small namespaced logger with timestamp and log level.
 * Uses console under the hood.
 */
function createLogger(namespace = "app") {
  const envLevel = process.env.LOG_LEVEL || "info";
  const minLevelIndex = LEVELS.indexOf(envLevel.toLowerCase());
  const threshold = minLevelIndex === -1 ? LEVELS.indexOf("info") : minLevelIndex;

  const shouldLog = (levelIndex) => levelIndex >= threshold;

  const formatMessage = (level, message, meta) => {
    const time = new Date().toISOString();
    const metaPart =
      meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `[${time}] [${namespace}] [${level.toUpperCase()}] ${message}${metaPart}`;
  };

  return {
    debug(message, meta = {}) {
      if (!shouldLog(0)) return;
      // eslint-disable-next-line no-console
      console.debug(formatMessage("debug", message, meta));
    },
    info(message, meta = {}) {
      if (!shouldLog(1)) return;
      // eslint-disable-next-line no-console
      console.info(formatMessage("info", message, meta));
    },
    warn(message, meta = {}) {
      if (!shouldLog(2)) return;
      // eslint-disable-next-line no-console
      console.warn(formatMessage("warn", message, meta));
    },
    error(message, errorOrMeta = {}) {
      if (!shouldLog(3)) return;
      let meta = errorOrMeta;
      if (errorOrMeta instanceof Error) {
        meta = {
          message: errorOrMeta.message,
          stack: errorOrMeta.stack
        };
      }
      // eslint-disable-next-line no-console
      console.error(formatMessage("error", message, meta));
    }
  };
}

module.exports = {
  createLogger
};