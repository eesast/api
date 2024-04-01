import express from "express";
import fetch from "node-fetch";
import { gql } from "graphql-request";
import { client } from "..";
import { CronJob } from "cron";
import { exec } from "child_process";
import {message} from "antd";
import axios from "axios";
const router = express.Router();

const job = new CronJob("00 00 00 * * *", async () => {
  exec("python3 UpdateWeekly.py", async (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    const URL = JSON.parse(stdout);

    let LATESTID = 0;
    try {
      const response = await axios.post("/weekly/LatestId");
      if (response.status === 200){
        message.success("LatestId获取成功！");
        LATESTID = response.data;
      }
      else throw Error("LatestId failed");
    } catch (err) {
      console.log(err);
      message.error("LatestId获取失败！");
    }
    if(URL != "null"){
      try {
        const response = await axios.post("/weekly/insert", {
          id: LATESTID+1,
          url: URL,
        });
        if (response.status === 200)
          message.success("推送添加成功！");
        else throw Error("Insert failed");
      } catch (err) {
        console.log(err);
        message.error("推送添加失败！");
      }
    }
  });
});

// Start the Cron job
job.start();

router.get("/cover", async (req, res) => {
    try {
        if (!req.query.url) return res.status(400).send("400 Bad Request: no url provided!");
        const url: any = req.query.url;
        const response = await fetch(
            url,
            { method: "GET"}
        );
        if (response.ok) {
            const text: string = await response.text();
            const match = text.match(/var msg_cdn_url = "(.*?)";/);
            if (match && match[1])
              res.status(200).send(match[1]);
            else throw(Error("capture failed!"));
        }
        else return res.status(500).send("500 Internal Server Error: fetch failed!");
    } catch (err) {
        return res.status(500).send("500 Internal Server Error: " + err);
    }
})

const getTitle = async (url: string) => {
    try {
        const response = await fetch(
            url,
            { method: "GET"}
        );
        if (response.ok) {
            const text: string = await response.text();
            const match = text.match(/meta property="og:title" content=".*"/);
            if (match == null) throw(Error("capture failed!"));
            const title = match[0].slice(34, -1);
            return title;
        }
        else throw(Error("fetch failed!"));
    } catch (err: any) {
        return err;
    }
}

router.post("/insert", async (req, res) => {
    try {
        if (!req.body.id || !req.body.url) return res.status(400).send("400 Bad Request: not enough params!");
        const title: string = await getTitle(req.body.url);
        const QueryGreaterIds = await client.request(
            gql`
              query QueryGreaterIds($_id: Int) {
                weekly(where: {id: {_gt: $_id}}) {
                  id
                }
              }
            `,
            { _id: req.body.id }
        );
        const sorted_ids = [...QueryGreaterIds.weekly];
        sorted_ids.sort((a: any, b: any) => {
            return a.id - b.id;
        })
        for (let i = sorted_ids.length - 1; i >= 0; i--) {
            await client.request(
                gql`
                  mutation IncreaseIds($_id: Int) {
                    update_weekly(where: {id: {_eq: $_id}}, _inc: {id: 1}) {
                      affected_rows
                    }
                  }
                `,
                { _id: sorted_ids[i].id }
            );
        }
        await client.request(
            gql`
              mutation Insert_Weekly_One($id: Int, $title: String, $url: String) {
                insert_weekly_one(object: {id: $id, title: $title, url: $url}) {
                  id
                  title
                  url
                }
              }
            `,
            { id: req.body.id + 1, title: title, url: req.body.url }
        );
        return res.status(200).send("ok");
    } catch (err) {
        return res.status(500).send("500 Internal Server Error: " + err);
    }
})

router.post("/delete", async (req, res) => {
    try {
        if (!req.body.id) return res.status(400).send("400 Bad Request: not enough params!");
        const QueryGreaterIds = await client.request(
            gql`
              query QueryGreaterIds($_id: Int) {
                weekly(where: {id: {_gt: $_id}}) {
                  id
                }
              }
            `,
            { _id: req.body.id }
        );
        const sorted_ids = [...QueryGreaterIds.weekly];
        sorted_ids.sort((a: any, b: any) => {
            return a.id - b.id;
        })
        await client.request(
            gql`
              mutation Delete_Weekly_One($_id: Int) {
                delete_weekly(where: {id: {_eq: $_id}}) {
                  affected_rows
                }
              }
            `,
            { _id: req.body.id }
        );
        for (let i = 0; i < sorted_ids.length; i++) {
            await client.request(
                gql`
                  mutation IncreaseIds($_id: Int) {
                    update_weekly(where: {id: {_eq: $_id}}, _inc: {id: -1}) {
                      affected_rows
                    }
                  }
                `,
                { _id: sorted_ids[i].id }
            );
        }
        return res.status(200).send("ok");
    } catch (err) {
        return res.status(500).send("500 Internal Server Error: " + err);
    }
})

router.post("/init", async (req, res) => {
    try {
        if (!req.body.data) return res.status(400).send("400 Bad Request: no data provided!");
        await client.request(
            gql`
              mutation Init($objects: [weekly_insert_input!] = {}) {
                insert_weekly(objects: $objects) {
                  affected_rows
                }
              }
            `,
            { objects: req.body.data }
        );
        return res.status(200).send("ok");
    } catch (err) {
        return res.status(500).send("500 Internal Server Error: " + err);
    }
})

export default router;

// var access_token: string;
// var weeklys: any = [];
// var newest_article_id: string;
// var items: any = [];

// // 微信公众平台验证
// router.get("/", async (req, res) => {
//     try {
//         const signature = req.query.signature;
//         const timestamp = req.query.timestamp;
//         const nonce = req.query.nonce;
//         const echostr = req.query.echostr;
//         const token = process.env.WX_TOKEN;
//         console.log(signature, timestamp, nonce, echostr);
//         if (!(signature && timestamp && nonce && echostr)) return res.status(401).send("401 Unauthorized: missing param");
//         const list = [token, timestamp, nonce];
//         list.sort();
//         let str = list.join("");
//         str = sha1(str);
//         if (str == signature) return res.status(200).send(echostr);
//         else return res.status(401).send("401 Unauthorized: authentication failure");
//     } catch (err) {
//         console.log("Error occurs!\n" + err);
//         return res.status(500).send("500 Internal Server Error: " + err);
//     }
// });

// // 获取图文列表
// router.post("/fetchall", authenticate(), async (req, res) => {
//     try {
//         let total_count: number;
//         let params = new URLSearchParams();
//         params.append("access_token", access_token);
//         params.append("offset", "0");
//         params.append("count", "1");
//         params.append("no_content", "1");
//         let response = await fetch(
//             "https://api.weixin.qq.com/cgi-bin/freepublish/batchget",
//             { method: "POST", body: params}
//         );
//         let result: any = await response.json();
//         if (result.ok && result.errcode == 0) {
//             total_count = result.total_count;
//         }
//         else return res.status(500).send("500 Internal Server Error: fetch failed!");

//         let count = total_count;
//         while (1) {
//             params.set("offset", String(count - 1));
//             response = await fetch(
//                 "https://api.weixin.qq.com/cgi-bin/freepublish/batchget",
//                 { method: "POST", body: params}
//             );
//             result = await response.json();
//             if (result.ok && result.errcode == 0) {
//                 if (newest_article_id == result.item[0].article_id) {
//                     console.log("up-to-date now");
//                     break;
//                 } else {
//                     items.push(result.item[0]);
//                     for (let new_item of result.item[0].content.news_item) {
//                         let i = 0;
//                         if (new_item.title.search("SAST Weekly") != -1) {
//                             weeklys.push({
//                                 article_id: result.item[0].article_id,
//                                 title: new_item.title,
//                                 url: new_item.url,
//                                 update_time: result.item[0].update_time,
//                                 sequence: i
//                             });
//                         }
//                         i++;
//                     }
//                     count--;
//                 }
//             }
//             else return res.status(500).send("500 Internal Server Error: fetch failed!");
//         }

//         newest_article_id = items[items.length - 1].article_id;
//         return res.status(200).send({weeklys});
//     } catch (err) {
//         console.log("Error occurs!\n" + err);
//         return res.status(500).send("500 Internal Server Error: " + err);
//     }
// })

// // 获取图文
// router.post("/fetch", authenticate(), async (req, res) => {
//     try {
//         let params = new URLSearchParams();
//         params.append("access_token", access_token);
//         params.append("article_id", req.body.article_id);
//         let response = await fetch(
//             "https://api.weixin.qq.com/cgi-bin/freepublish/getarticle",
//             { method: "POST", body: params}
//         );
//         let result: any = await response.json();
//         if (result.ok && result.errcode == 0) {
//             return res.status(200).send(result.news_item[req.body.sequence]);
//         }
//         else return res.status(500).send("500 Internal Server Error: fetch failed!");
//     } catch (err) {
//         console.log("Error occurs!\n" + err);
//         return res.status(500).send("500 Internal Server Error: " + err);
//     }
// })

// // 定时获取AccessToken
// const weekly_cron = () => {
//     cron.schedule(`* ${Number(process.env.WX_EXPIRED_TIME)-5} * * * *`, async () => {
//         try {
//             const params = new URLSearchParams();
//             params.append("grant_type", "client_credential");
//             params.append("appid", `${process.env.WX_APPID}`);
//             params.append("secret", `${process.env.WX_APPSECRET}`);

//             const response = await fetch(
//               "https://api.weixin.qq.com/cgi-bin/token",
//               { method: "GET", body: params}
//             );
//             const result: any = await response.json();
//             if (result.ok && result.errcode == 0) {
//                 access_token = result.access_token;
//                 console.log("access token updated");
//             } else {
//                 console.log(result.errcode + result.errmsg);
//             }
//         } catch (err) {
//             console.log("Error occurs!\n" + err);
//         }
//     })
// }

// // 初始化获取全部weekly推送
// const weekly_init = async () => {
//     let offset = 0;
//     try {
//         while (1) {
//             const params = new URLSearchParams();
//             params.append("access_token", access_token);
//             params.append("offset", String(offset));
//             params.append("count", "20");
//             params.append("no_content", "1");
//             const response = await fetch(
//                 "https://api.weixin.qq.com/cgi-bin/freepublish/batchget",
//                 { method: "POST", body: params}
//             );
//             const result: any = await response.json();
//             if (result.ok && result.errcode == 0) {
//                 if (result.item_count < 20) {
//                     items.push(result.item);
//                     newest_article_id = result.item[result.item.length - 1].article_id;
//                     break;
//                 } else {
//                     items.push(result.item);
//                     offset += 20;
//                 }
//             }
//             else return console.log("fetch failed!");
//         }
//         for (let item of items) {
//             for (let new_item of item.content.news_item) {
//                 let i = 0;
//                 if (new_item.title.search("SAST Weekly") != -1) {
//                     weeklys.push({
//                         article_id: item.article_id,
//                         title: new_item.title,
//                         url: new_item.url,
//                         update_time: item.update_time,
//                         sequence: i
//                     });
//                 }
//                 i++;
//             }
//         }
//     }
//     catch (err) {
//         console.log("error!" + err);
//     }
// }
// export {router, weekly_cron, weekly_init};
