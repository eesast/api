import Docker from "dockerode";
import { join } from "path";
import * as fs from "fs/promises";


export const get_base_directory = async () => {
    return process.env.NODE_ENV === "production" ? '/data' : process.env.BASE_DIR!; // BASE_DIR is /var/contest, for example
}

type ContestImages = {
  [key: string]: {
    COMPILER_IMAGE: string;
    COMPILER_TIMEOUT: string;
    SERVER_IMAGE: string;
    CLIENT_IMAGE: string;
    ENVOY_IMAGE: string;
    RUNNER_TOKEN_TIMEOUT: string
  };
};

export const contest_image_map: ContestImages = {
  "THUAI6": {
    SERVER_IMAGE: "eesast/thuai6_run",
    CLIENT_IMAGE: "eesast/thuai6_run",
    COMPILER_IMAGE: "eesast/thuai6_cpp",
    ENVOY_IMAGE: "envoyproxy/envoy:dev-55a95a171c1371b2402e9c8e2092f5b0ca02462d",
    COMPILER_TIMEOUT: "10m",
    RUNNER_TOKEN_TIMEOUT: "30m",
  },
  "THUAI7": {
    SERVER_IMAGE: "eesast/thuai7_run_server",
    CLIENT_IMAGE: "eesast/thuai7_run_client",
    COMPILER_IMAGE: "eesast/thuai7_cpp",
    ENVOY_IMAGE: "envoyproxy/envoy:dev-55a95a171c1371b2402e9c8e2092f5b0ca02462d",
    COMPILER_TIMEOUT: "10m",
    RUNNER_TOKEN_TIMEOUT: "30m"
  }
}


export interface TeamLabelBind {
  team_id: string;
  label: string;
}

export interface ContestResult { // used by server docker.
  status: string; // value: `Finished` or `Crashed`.
  scores: number[]; // order is the same as `team_label_binds`.
};

export interface TeamResult { // used by backend.
  team_id: string;
  score: number;
};





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
