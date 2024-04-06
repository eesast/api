import express from "express";
import fs from "fs/promises";
import jwt from "jsonwebtoken";
import authenticate, { JwtCompilerPayload } from "../middlewares/authenticate";
import fStream from 'fs';
import * as hasura from "../helpers/hasura";
import * as utils from "../helpers/utils";


const router = express.Router();



/**
 * PUT upload code, for test only
 * @param {string} contest_name
 * @param {uuid} code_id
 * @param {uuid} team_id
 * @param {string} suffix
 * @param {string} path
*/
router.put("/upload", async (req, res) => {
  if (process.env.NODE_ENV === "production")
    return res.status(403).send("403 Forbidden: This API is disabled in production environment.");

  const contest_name = req.body.contest_name;
  const code_id = req.body.code_id;
  const team_id = req.body.team_id;
  const suffix = req.body.suffix;
  const path = req.body.path;

  const cos = await utils.initCOS();
  const config = await utils.getConfig();

  if (!suffix) {
    const key = `${contest_name}/code/${team_id}/${code_id}`;
    const localFilePath = `${path}/${code_id}`;
    await utils.uploadObject(localFilePath, key, cos, config);
  } else {
    const key = `${contest_name}/code/${team_id}/${code_id}.${suffix}`;
    const localFilePath = `${path}/${code_id}.${suffix}`;
    await utils.uploadObject(localFilePath, key, cos, config);
  }
  return res.status(200).send("200 OK: Upload success");
})


/**
 * GET download code, for test only
 * @param {string} contest_name
 * @param {uuid} code_id
 * @param {uuid} team_id
 * @param {string} suffix
 * @param {string} path
*/
router.get("/download", async (req, res) => {
  if (process.env.NODE_ENV === "production")
    return res.status(403).send("403 Forbidden: This API is disabled in production environment.");

  const contest_name = req.body.contest_name;
  const code_id = req.body.code_id;
  const team_id = req.body.team_id;
  const suffix = req.body.suffix;
  const path = req.body.path;

  const cos = await utils.initCOS();
  const config = await utils.getConfig();

  if (!suffix) {
    const key = `${contest_name}/code/${team_id}/${code_id}`;
    const outputPath = `${path}/${code_id}`;
    await utils.downloadObject(key, outputPath, cos, config);
  } else {
    const key = `${contest_name}/code/${team_id}/${code_id}.${suffix}`;
    const outputPath = `${path}/${code_id}.${suffix}`;
    await utils.downloadObject(key, outputPath, cos, config);
  }
  return res.status(200).send("200 OK: Download success");
})


/**
 * POST compile start
 * @param {token}
 * @param {uuid} code_id
 * @param {string} path (optional, default to contest_name/code/team_id)
 **/
router.post("/compile-start", authenticate(), async (req, res) => {
  try {
    const code_id = req.body.code_id;
    const user_uuid = req.auth.user.uuid;
    if (!code_id || !user_uuid) {
      return res.status(422).send("422 Unprocessable Entity: Missing credentials");
    }

    const { contest_id, contest_name, team_id, language, compile_status} = await hasura.query_code(code_id);
    if (!contest_id || !team_id || !language) {
      return res.status(404).send("404 Not Found: Code unavailable");
    }
    if (compile_status === "Completed") {
      return res.status(400).send("400 Bad Request: Code already compiled");
    }

    const is_manager = await hasura.get_maneger_from_user(user_uuid, contest_id);
    if (!is_manager) {
      const user_team_id = await hasura.get_team_from_user(user_uuid, contest_id);
      if (!user_team_id) {
        return res.status(403).send("403 Forbidden: User not in team");
      } else if (user_team_id !== team_id) {
        return res.status(403).send("403 Forbidden: User not in team");
      }
    }

    if (language !== "cpp") {
      if (language === "py") {
        return res.status(400).send("400 Bad Request: Interpreted language do not require compilation.");
      } else {
        return res.status(400).send("400 Bad Request: Unsupported language.");
      }
    }

    console.log("start to get sts")
    const cosPath = req.body.path ? req.body.path : `${contest_name}/code/${team_id}`;
    const base_directory = await utils.get_base_directory();

    try {
      const cos = await utils.initCOS();
      const config = await utils.getConfig();
      console.log("start to download files")

      const key = `${cosPath}/${code_id}.${language}`;
      console.log(base_directory)
      const outputPath = `${base_directory}/${contest_name}/code/${team_id}/${code_id}/source/${code_id}.${language}`;

      await fs.mkdir(`${base_directory}/${contest_name}/code/${team_id}/${code_id}/source`, { recursive: true });
      await utils.downloadObject(key, outputPath, cos, config);

    } catch (err) {
      return res.status(500).send("500 Internal Server Error: Download code failed. " + err);
    }

    try {
      const docker = await utils.initDocker();
      let containerRunning = false;
      const containerList = await docker.listContainers();
      containerList.forEach((containerInfo) => {
        if (containerInfo.Names.includes(`${contest_name}_Compiler_${code_id}`)) {
            containerRunning = true;
        }
      });
      if (containerRunning) {
        return res.status(409).send("409 Confilct: Code already in compilation");
      }

      console.log("start to create container")
      const url =
        process.env.NODE_ENV === "production"
          ? "https://api.eesast.com/code/compile-finish"
          : "http://128.0.0.1:28888/code/compile-finish";
      const compiler_token = jwt.sign(
        {
          code_id: code_id,
          team_id: team_id,
          contest_name: contest_name,
          cos_path: cosPath,
        } as JwtCompilerPayload,
        process.env.SECRET!,
        {
          expiresIn: utils.contest_image_map[contest_name].COMPILER_TIMEOUT,
        }
      );

      const container = await docker.createContainer({
        Image: utils.contest_image_map[contest_name].COMPILER_IMAGE,
        Env: [
          `URL=${url}`,
          `TOKEN=${compiler_token}`,
          `CODE_ID=${code_id}`,
          `LANG=${language}`
        ],
        HostConfig: {
          Binds: [
            `${base_directory}/${contest_name}/code/${team_id}/${code_id}/source:/usr/local/code`,
            `${base_directory}/${contest_name}/code/${team_id}/${code_id}/output:/usr/local/output`
          ],
          AutoRemove: true,
          NetworkMode: "host"
        },
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        //StopTimeout: parseInt(process.env.MAX_COMPILER_TIMEOUT as string),
        name: `${contest_name}_Compiler_${code_id}`
      });
      await container.start();
      console.log("container started")

      await hasura.update_compile_status(code_id, "Compiling");
      console.log("update compile status success")

      if (process.env.NODE_ENV !== "production") {
        return res.status(200).send("200 OK: Create container success. Compiler token: " + compiler_token);
      } else {
        return res.status(200).send("200 OK: Create container success");
      }

    } catch (err) {
      return res.status(500).send("500 Internal Server Error: Create container failed. " + err);
    }
  } catch (err) {
    return res.status(500).send("500 Internal Server Error: Unknown error. " + err);
  }
});




/**
 * POST compile finish
 * @param {token}
 * @param {string} compile_status
*/
router.post("/compile-finish", async (req, res) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader) {
      return res.status(401).send("401 Unauthorized: Missing token");
    }
    const token = authHeader.substring(7);
    return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
      if (err || !decoded) {
        return res.status(401).send("401 Unauthorized: Token expired or invalid");
      }
      const payload = decoded as JwtCompilerPayload;
      const code_id = payload.code_id;
      const team_id = payload.team_id;
      const contest_name = payload.contest_name;
      const compile_status = req.body.compile_status;
      const cosPath = payload.cos_path;
      const base_directory = await utils.get_base_directory();
      if (!compile_status || !team_id || !code_id || !contest_name) {
        return res.status(422).send("422 Unprocessable Entity: Missing credentials");
      }
      console.log(`${team_id}:${code_id}:compile:${compile_status}`);
      if (compile_status !== "Success" && compile_status !== "Failed")
        return res.status(400).send("400 Bad Request: Invalid compile status");


      try {
        const cos = await utils.initCOS();
        const config = await utils.getConfig();

        if (compile_status === "Success") {
          const key = `${cosPath}/${code_id}`;
          const localFilePath = `${base_directory}/${contest_name}/code/${team_id}/${code_id}/output/${code_id}`;
          await utils.uploadObject(localFilePath, key, cos, config);
        }
        let key = `${cosPath}/${code_id}.log`;
        let localFilePath = `${base_directory}/${contest_name}/code/${team_id}/${code_id}/output/${code_id}.log`;
        await utils.uploadObject(localFilePath, key, cos, config);

        key = `${cosPath}/${code_id}.curl.log`;
        localFilePath = `${base_directory}/${contest_name}/code/${team_id}/${code_id}/output/${code_id}.curl.log`;
        await utils.uploadObject(localFilePath, key, cos, config);

      } catch (err) {
        return res.status(500).send("500 Internal Server Error: Upload files failed. " + err);
      }

      try {
        await hasura.update_compile_status(code_id, compile_status);
      } catch (err) {
        return res.status(500).send("500 Internal Server Error: Update compile status failed. " + err);
      }

      try {
        await utils.deleteAllFilesInDir(`${base_directory}/${contest_name}/code/${team_id}/${code_id}`);
      } catch (err) {
        return res.status(500).send("500 Internal Server Error: Delete files failed. " + err);
      }

      return res.status(200).send("200 OK: Update compile status success");
    });
  } catch (err) {
    return res.status(500).send("500 Internal Server Error: Unknown error. " + err);
  }
});


// router.post("/sync-map", authenticate(), async (req, res) => {
//   const user_uuid = req.auth.user.uuid;
//   if (!user_uuid) {
//     return res.status(422).send("422 Unprocessable Entity: Missing credentials");
//   }
//   const { contest_list, map_list }: { contest_list: string[], map_list: string[] } = await hasura.get_all_maps();
//   const base_dictionary = await utils.get_base_directory();

//   const sync_map_promises = contest_list.map((contest_id, index) => {
//     await hasura.get_maneger_from_user(user_uuid, contest_id)
//     .then((is_manager: any) => {
//       if (is_manager) {
//         const contest_name = await hasura.get_contest_name(contest_id);
//         const cos = await utils.initCOS();
//         const config = await utils.getConfig();
//         // download all files in ${contest_name}/map/${map_id} folder in COS to ${base_dic}/${contest_name}/map/${map_id} folder
//         // if there are more than one file in the folder, log the error and return 500

//         const map_id = map_list[index];
//         const key = `${contest_name}/map/${map_id}`;
//         const outputPath = `${base_dictionary}/${contest_name}/map/${map_id}`;
//         await utils.downloadObject(key, outputPath, cos, config);

//       }
//     })
// });


// /**
//  * GET compile logs
//  * @param {token}
//  * @param {uuid} contest_id
//  * @param {string} team_id
//  * @param {number} usr_seq
//  */
// router.get("/logs/:team_id/:usr_seq", async (req, res) => {
//   const authHeader = req.get("Authorization");
//   if (!authHeader) {
//     return res.status(401).send("401 Unauthorized: Missing token");
//   }
//   const token = authHeader.substring(7);
//   return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
//     if (err || !decoded) {
//       return res.status(401).send("401 Unauthorized: Token expired or invalid");
//     }

//     const payload = decoded as JwtUserPayload;
//     const user_uuid = payload.uuid;
//     const contest_id = req.body.contest_id;
//     const team_id = req.params.team_id;
//     const usr_seq = req.params.usr_seq;
//     const contest_name = await hasura.get_contest_name(contest_id);
//     const query_if_manager = await client.request(
//       gql`
//         query query_is_manager($contest_id: uuid!, $user_uuid: uuid!) {
//           contest_manager(where: {_and: {contest_id: {_eq: $contest_id}, user_uuid: {_eq: $user_uuid}}}) {
//             user_uuid
//           }
//         }
//       `,
//       {
//         contest_id: contest_id,
//         user_uuid: user_uuid
//       }
//     );
//     const is_manager = query_if_manager.contest_manager != null;
//     if (is_manager) {
//       const query_if_team_exists = await client.request(
//         gql`
//           query query_team_exists($contest_id: uuid!, $team_id: uuid!) {
//             contest_team(where: {_and: {contest_id: {_eq: $contest_id}, team_id: {_eq: $team_id}}}) {
//               team_id
//             }
//           }
//         `,
//         {
//           contest_id: contest_id,
//           team_id: team_id
//         }
//       );
//       const team_exists = query_if_team_exists.contest_team != null;
//       if (team_exists) {
//         try {
//           res.set("Cache-Control", "no-cache");
//           res.set("Expires", "0");
//           res.set("Pragma", "no-cache");
//           return res
//             .status(200)
//             .sendFile(`${hasura.base_directory}/${contest_name}/code/${team_id}/compile_log${usr_seq}.txt`, {
//               cacheControl: false,
//             });
//         } catch (err) {
//           return res.status(400).send(err);
//         }
//       } else return res.status(404).send("队伍不存在！");
//     } else {
//       try {
//         const query_in_team = await client.request(
//           gql`
//             query query_if_in_team($team_id: uuid!, $user_uuid: uuid!, $contest_id: uuid!) {
//               contest_team(
//                 where: {
//                   _and: [
//                     { contest_id: { _eq: $contest_id } }
//                     { team_id: { _eq: $team_id } }
//                     {
//                       _or: [
//                         { team_leader_uuid: { _eq: $user_uuid } }
//                         { contest_team_members: { user_uuid: { _eq: $user_uuid } } }
//                       ]
//                     }
//                   ]
//                 }
//               ) {
//                 team_id
//               }
//             }
//           `,
//           {
//             contest_id: contest_id,
//             team_id: team_id,
//             user_uuid: user_uuid,
//           }
//         );
//         const is_in_team = query_in_team.contest_team.length != 0;
//         if (is_in_team) {
//           res.set("Cache-Control", "no-cache");
//           res.set("Expires", "0");
//           res.set("Pragma", "no-cache");
//           return res
//             .status(200)
//             .sendFile(`${hasura.base_directory}/${contest_name}/code/${team_id}/compile_log${usr_seq}.txt`, {
//               cacheControl: false,
//             });
//         } else
//           return res.status(401).send("你不在队伍中");
//       } catch (err) {
//         return res.status(400).send(err);
//       }
//     }
//   });
// });

export default router;
