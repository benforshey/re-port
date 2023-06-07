import path from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, readFile } from "node:fs/promises";
import { stdout } from "node:process";
import YAML from "yaml";

const __filename = fileURLToPath(import.meta.url);
const workingDirectory = path.dirname(__filename);

const pipeline = formatAsCSV(
  parseExposedServices(
    parseFileServices(filterUnwantedPaths(getAllFilePaths(workingDirectory)))
  )
);

(async () => {
  for await (const entry of pipeline) {
    stdout.write(entry);
  }
})()
// TODO review licenses of deps

/**
 * Yields all files from the directory, recursively.
 * @param {String} directory
 */
async function* getAllFilePaths(directory) {
  try {
    const paths = await readdir(directory, {
      recursive: true,
      withFileTypes: true,
    });

    for (const path of paths) {
      if (path.isFile()) {
        yield `${path.path}/${path.name}`;
      }
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
    for await (const path of pathIterable) {
      if (/docker-compose.*\.yml$/.test(path)) {
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
  try {
    for await (const path of pathIterable) {
      yield {
        path,
        services: YAML.parse(await readFile(path, { encoding: "utf8" }))
          .services,
      };
    }
  } catch (error) {
    console.error(error);
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
            return Object.hasOwn(declarations, "ports")
              ? [{ name, ports: declarations.ports.join(" and ") }]
              : [];
          }
        ),
      };
    }
  } catch (error) {
    console.error(error);
  }
}

/**
 * Forats the path and exposed services as sparse CSV matrix.
 * @param {Iterable} exposedServicesIterable
 */
async function* formatAsCSV(exposedServicesIterable) {
  try {
    const headers = `PATH,SERVICE,PORTS`;

    for await (const service of exposedServicesIterable) {
      let serviceConfigs = ``;

      service.exposedServices.forEach((service) => {
        serviceConfigs += `,${service.name},${service.ports}\n`;
      });

      yield `${headers}\n${service.path},,\n${serviceConfigs}\n`;
    }
  } catch (error) {
    console.error(error);
  }
}
