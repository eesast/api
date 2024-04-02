
export const get_base_directory = async () => {
    return process.env.NODE_ENV === "production" ? '/data' : process.env.BASE_DIR!;
}

type ContestImages = {
  [key: string]: {
    RUNNER_IMAGE: string;
    COMPILER_IMAGE: string;
    COMPILER_TIMEOUT: string;
  };
};

export const contest_image_map: ContestImages = {
  "THUAI6": {
    RUNNER_IMAGE: "eesast/thuai6_run",
    COMPILER_IMAGE: "eesast/thuai6_cpp",
    COMPILER_TIMEOUT: "10m"
  },
  "THUAI7": {
    RUNNER_IMAGE: "eesast/thuai7_run",
    COMPILER_IMAGE: "eesast/thuai7_cpp",
    COMPILER_TIMEOUT: "10m"
  }
}
