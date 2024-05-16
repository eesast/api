
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

export interface JwtCompilerPayload {
  code_id: string;
  team_id: string;
  contest_name: string;
  cos_path: string;
}

export interface JwtServerPayload {
  contest_id: string;
  round_id?: string;
  room_id: string;
  team_label_binds: TeamLabelBind[];
}

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
