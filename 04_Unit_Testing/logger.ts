// Add "std/": "https://deno.land/std@0.170.0/" to "imports" in ./import_map.json
import * as log from "std/log/mod.ts";

// Simple logger using std modules
export const Logger = function (
  level?: string,
): log.Logger {
  const logLevel: log.LevelName = level === undefined
    ? "DEBUG" // the default log level
    : level as log.LevelName;
  // Note that this method call make global effects
  log.setup({
    handlers: {
      console: new log.handlers.ConsoleHandler(logLevel),
    },
    loggers: {
      default: {
        level: logLevel,
        handlers: ["console"],
      },
    },
  });
  return log.getLogger();
};
