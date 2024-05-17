import Docker from "dockerode";
import { join } from "path";
import * as fs from "fs/promises";


export const get_base_directory = async () => {
    return process.env.NODE_ENV === "production" ? '/data' : process.env.BASE_DIR!; // BASE_DIR is /var/contest, for example
}


export async function initDocker() {
  const docker =
    process.env.DOCKER === "remote"
      ? new Docker({
        host: process.env.DOCKER_URL!,
        port: process.env.DOCKER_PORT!,
      })
      : new Docker();
  return docker;
}


export async function deleteAllFilesInDir(directoryPath: string) {
  const files = await fs.readdir(directoryPath);
  await Promise.all(files.map(async (file) => {
    const filePath = join(directoryPath, file);
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      await deleteAllFilesInDir(filePath);
    } else {
      await fs.unlink(filePath);
    }
  }
  ));
  await fs.rmdir(directoryPath);
}

export async function checkPathExists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch (err) {
    return false;
  }
}
