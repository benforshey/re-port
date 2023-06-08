#!/usr/bin/env node

const { readdir, readFile } = require("fs").promises;
const { resolve } = require("path");
const { cwd, stdout } = require("process");
const YAML = require("yaml");

const pipeline = formatAsCSV(
  parseExposedServices(
    parseFileServices(filterUnwantedPaths(getAllFilePaths(cwd())))
  )
);

(async () => {
  for await (const entry of pipeline) {
    stdout.write(entry);
  }
})();

/**
 * Yields all files from the directory, recursively.
 * @param {String} directory
 */
async function* getAllFilePaths(directory) {
  try {
    const paths = await readdir(directory, {
      withFileTypes: true,
    });

    for (const path of paths) {
      (await path.isDirectory())
        ? yield* getAllFilePaths(resolve(directory, path.name))
        : yield `${directory}/${path.name}`;
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Filters out unwanted paths, yielding only the files we're interested in processing.
 * @param {Iterable} pathIterable
 */
async function* filterUnwantedPaths(pathIterable) {
  try {
    const fileRegexp = /docker-compose.*\.yml$/;

    for await (const path of pathIterable) {
      if (fileRegexp.test(path)) {
        yield path;
      }
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Parses the YAML file's services into JSON, yielding the file path and all services.
 * @param {Iterable} pathIterable
 */
async function* parseFileServices(pathIterable) {
  let errorPath;

  try {
    for await (const path of pathIterable) {
      errorPath = path;

      yield {
        path,
        services: YAML.parse(await readFile(path, { encoding: "utf8" }))
          .services,
      };
    }
  } catch (error) {
    console.error(error);

    yield {
      error,
      path: errorPath,
      services: {},
    };
  }
}

/**
 * Parses the services, yielding information about only those that have exposed ports.
 * @param {Iterable} fileServicesIterable
 */
async function* parseExposedServices(fileServicesIterable) {
  try {
    for await (const file of fileServicesIterable) {
      yield {
        path: file.path,
        exposedServices: Object.entries(file.services).flatMap(
          ([name, declarations]) => {
            return declarations.hasOwnProperty("ports")
              ? [{ name, ports: declarations.ports.join(" and ") }]
              : [];
          }
        ),
        ...(file.error && { error: file.error }),
      };
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Formats the path and exposed services as sparse CSV matrix.
 * @param {Iterable} exposedServicesIterable
 */
async function* formatAsCSV(exposedServicesIterable) {
  try {
    for await (const service of exposedServicesIterable) {
      let serviceConfigs = ``;

      service.exposedServices.forEach((service) => {
        serviceConfigs += `,${service.name},${service.ports}\n`;
      });

      yield !service.error
        ? `PATH,SERVICE,PORTS\n${service.path},,\n${serviceConfigs}\n`
        : `PATH,ERROR\n${service.path},"${service.error}"\n`;
    }
  } catch (error) {
    console.error(error);
  }
}
