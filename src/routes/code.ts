import express from "express";
import Docker from "dockerode";
import * as fs from "fs/promises";
import multer from "multer";
import { gql } from "graphql-request";
import { client } from "..";
//import hasura from "../middlewares/hasura"
//import authenticate from '../middlewares/authenticate'

const router = express.Router();

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const id = req.query["id"];
    const teamId = req.query["teamId"];

    await fs.mkdir(`/data/thuai4/${teamId}/${id}`, {
      recursive: true,
      mode: 0o775,
    });

    cb(null, `/data/thuai4/${teamId}/${id}`);
  },

  filename: function (req, file, cb) {
    cb(null, "player.cpp");
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1000000,
    files: 1,
  },
});

/**
 * GET playercode
 * @param {string} id
 * @returns playercode
 */
router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = gql`
      query MyQuery($id: String!) {
        user_code_by_pk(id: $id) {
          code_content
        }
      }
    `;

    const data = await client.request(query, {
      id: id,
    });

    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
  }
});

/**
 * POST playerCode
 * @param {string} id
 * @param {string} teamId
 * @param {file} playercode
 * @returns Success or error
 */
router.post("/", upload.single("playercode"), async (req, res) => {
  try {
    const id = req.query["id"];
    const teamId = req.query["teamId"];
    const data = await fs.readFile(`/data/thuai4/${teamId}/${id}`, "utf8");

    const mutation = gql`
      mutation insert_user_code(
        $id: String!
        $team_id: uuid
        $code_content: String
      ) {
        insert_user_code_one(
          object: { id: $id, team_id: $team_id, code_content: $code_content }
        ) {
          id
        }
      }
    `;
    await client.request(mutation, {
      id: id,
      team_id: teamId,
      code_content: data,
    });
  } catch (error) {
    return res.status(400);
  }
  res.status(200).end();
});

/**
 * PUT update user_code
 * @param {file} playercode
 * @param {string} id
 * @param {string} teamId
 */
router.put("/", upload.single("playercode"), async (req, res) => {
  console.log(client);

  try {
    const id = req.query["id"];
    const teamId = req.query["teamId"];
    const data = await fs.readFile(
      `/data/thuai4/${teamId}/${id}/player.cpp`,
      "utf8"
    );

    const mutation = gql`
      mutation update_user_code($id: String!, $code_content: String) {
        update_user_code_by_pk(
          pk_columns: { id: $id }
          _set: { code_content: $code_content }
        ) {
          id
        }
      }
    `;
    console.log(process.env.HASURA_URL);
    await client.request(mutation, {
      id: id,
      code_content: data,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).end();
  }
  res.status(200).end();
});

/**
 * POST compile
 * @param {number} id
 * @param {number} teamId
 * @returns Success or Error
 */
router.post("/compile1", async (req, res) => {
  try {
    //TODO:检查选手代码是否存在
    const id = req.body.id;
    const teamId = req.body.teamId;

    const docker = new Docker();
    const containerList = await docker.listContainers();

    let containerRunning = false;
    containerList.forEach((containerInfo) => {
      if (containerInfo.Names.includes(`THUAI_Compiler_${id}`)) {
        containerRunning = true;
      }
    });

    if (!containerRunning) {
      const container = await docker.createContainer({
        Image: "eesast/thuai_compiler:latest",
        HostConfig: {
          Binds: [`/data/thuai4/${teamId}/${id}:/usr/local/mnt`],
          AutoRemove: true,
        },
        Cmd: ["sh", "/usr/local/CAPI/compile.sh"],
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        StopTimeout: 60,
        name: `THUAI_Compiler_${id}`,
      });

      await container.start();
      return res.status(200).send("200 Success: Compile Start");
    } else {
      return res.status(409).send("409 Conflict: Code is compiling");
    }
  } catch (error) {
    return res.status(400);
  }
});

//查询用户代码之后再编译
/**
 * POST compile
 * @param {number} id
 * @param {number} teamId
 * @returns Success or Error
 */
router.post("/compile", async (req, res) => {
  try {
    //TODO:检查选手代码是否存在
    const id = req.body.id;
    const teamId = req.body.teamId;

    const query = gql`
      query verify_user_code($id: String, $teamId: uuid) {
        user_code(where: { id: { _eq: $id }, team_id: { _eq: $teamId } }) {
          code_content
        }
      }
    `;
    try {
      const data = await client.request(query, {
        id: id,
        teamId: teamId,
      });
      const code = data.user_code[0].code_content;
      if (!code || code === "") return res.status(400).end("empty code");

      try {
        await fs.writeFile(
          `/data/thuai4/${teamId}/${id}/player.cpp`,
          code,
          "utf-8"
        );
      } catch (error) {
        return res.status(400).end("fs error");
      }

      const docker = new Docker();
      const containerList = await docker.listContainers();

      let containerRunning = false;
      containerList.forEach((containerInfo) => {
        if (containerInfo.Names.includes(`THUAI_Compiler_${id}`)) {
          containerRunning = true;
        }
      });

      if (!containerRunning) {
        const container = await docker.createContainer({
          Image: "eesast/thuai_compiler:latest",
          HostConfig: {
            Binds: [`/data/thuai4/${teamId}/${id}:/usr/local/mnt`],
            AutoRemove: true,
          },
          Cmd: ["sh", "/usr/local/CAPI/compile.sh"],
          AttachStdin: false,
          AttachStdout: false,
          AttachStderr: false,
          StopTimeout: 60,
          name: `THUAI_Compiler_${id}`,
        });

        await container.start();
        return res.status(200).send("200 Success: Compile Start");
      } else {
        return res.status(409).send("409 Conflict: Code is compiling");
      }
    } catch (error) {
      return res.status(400).end("no access");
    }
  } catch (error) {
    return res.status(400);
  }
});

export default router;
