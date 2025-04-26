import express from "express";
import { gql } from "graphql-request";
import { client } from "..";
import axios from "axios";
import * as utils from "../helpers/utils";
import * as fs from "fs/promises";
import * as uuid from "../helpers/uuid";
import { get_newest_weekly, get_newest_weekly_id, add_weekly_list, WeeklyPost, check_weekly_exist } from "../hasura/share"
import authenticate from "../middlewares/authenticate";
import { Agent } from "https";
const router = express.Router();
const weixinSpider = async (headers: any, params: any, filename: string) => {
  const url = "https://mp.weixin.qq.com/cgi-bin/appmsg";
  let fcontrol :boolean = false;
  const base_directory = await utils.get_base_directory();
  try {
    console.log("Spider Start")
    const new_weekly_list: any[] = [];
    let i: number = 0;
    outerloop:
    while (!fcontrol) {
      params["begin"] = (i * 5).toString();
      i++;
      await new Promise(resolve => setTimeout(resolve, Math.random() * 9000 + 1000)); // 等待 1 到 10 秒之间的随机时间
      const response = await axios.get(url, {
        headers,
        params,
        httpsAgent: new Agent({ rejectUnauthorized: false })
      });
      const data = response.data;
      if (data.base_resp.ret === 200013) {
        console.log(`Frequency control, stop at ${params["begin"]}`);
        fcontrol = true;
        break;
      }
      if (!data.app_msg_list || data.app_msg_list.length === 0) {
        console.log('All article parsed');
        break;
      }
      const newest_weekly_date = await get_newest_weekly();
      const newest_weekly_id = await get_newest_weekly_id();
      for (const item of data.app_msg_list) {
        if (new Date(item.create_time * 1000) < newest_weekly_date) break outerloop;
        if (item.title.includes("SAST Weekly")) {
          const exist : boolean = await check_weekly_exist(new Date(item.create_time * 1000));
          if (exist) {
            continue;
          }
          const new_item: WeeklyPost = {
            title: item.title,
            url: item.link,
            date: new Date(item.create_time * 1000),
            id: newest_weekly_id + new_weekly_list.length + 1
          }
          new_weekly_list.push(new_item);
        }
      }
    }
    new_weekly_list.sort((a, b) => {
      return a.date.getTime() - b.date.getTime();
    });
    if (new_weekly_list.length > 0) {
      await add_weekly_list(new_weekly_list);
    }
    //using uuid as the files name
    if (!await utils.checkPathExists(`${base_directory}/weixinSpiderStatus`)) {
      await fs.mkdir(`${base_directory}/weixinSpiderStatus`);
    }
    await fs.writeFile(`${base_directory}/weixinSpiderStatus/${filename}`, "");
    console.log("Spider finished");
  }
  catch (error) {
    console.error('Error fetching articles:', error);
    await fs.writeFile(`${base_directory}/weixinSpiderStatus/${filename}-failed`, "");
  }
}

router.post("/check", authenticate(["counselor"]), async (req, res) => {
  try {
    const filename: string = req.body.filename;
    const base_directory = await utils.get_base_directory();
    if (await utils.checkPathExists(`${base_directory}/weixinSpiderStatus/${filename}`)) {
      return res.status(200).json({ finished: true , failed: false});
    } else if (await utils.checkPathExists(`${base_directory}/weixinSpiderStatus/${filename}-failed`)) {
      return res.status(200).json({ finished: false , failed: true});
    } else {
      return res.status(200).json({ finished: false , failed: false});
    }
  }
  catch (err) {
    return res.status(500).send("500 Internal Server Error: " + err);
  }
})

router.post("/renew", authenticate(["counselor"]), async (req, res) => {

  try {
    // 设置 headers
    const headers = {
      "Cookie": req.body.cookie,
      "User-Agent": req.body.useragent
    };
    const params = {
      "token": req.body.token,
      "lang": "zh_CN",
      "f": "json",
      "ajax": "1",
      "action": "list_ex",
      "begin": "1",
      "count": "5",
      "query": "",
      "fakeid": "MzA5MjA5NjIxNg%3D%3D",
      "type": "9",
    }
    const filename = uuid.uuid();
    weixinSpider(headers, params, filename);
    return res.status(200).json({ "filename": filename });
  } catch (err) {
    return res.status(500).send("500 Internal Server Error: " + err);
  }
  //// 爬虫初始参数
  //const url = "https://mp.weixin.qq.com/cgi-bin/appmsg";
  //let begin = "0";
  //const params = {
  //    "token": req.body.token,
  //    "lang": "zh_CN",
  //    "f": "json",
  //    "ajax": "1",
  //    "action": "list_ex",
  //    "begin": "1",
  //    "count": "5",
  //    "query": "",
  //    "fakeid": "MzA5MjA5NjIxNg%3D%3D",
  //    "type": "9",
  //};
  //// 用于频率控制
  //let fcontrol = 0;
  //let j = 0;
  //  try {
  //    console.log("开始爬虫")

  //      const app_msg_list: any[] = [];
  //      let i = Math.floor(app_msg_list.length / 5);

  //      while (true) {
  //          params["begin"] = (i * 5).toString();
  //          await new Promise(resolve => setTimeout(resolve, Math.random() * 9000 + 1000)); // 等待 1 到 10 秒之间的随机时间
  //          try {
  //              const response = await axios.get(url, {
  //                  headers,
  //                  params,
  //                  httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
  //              });
  //              const data = response.data;

  //              if (data.base_resp.ret === 200013) {
  //                  console.log(`Frequency control, stop at ${params["begin"]}`);
  //                  fcontrol = 1;
  //                  break;
  //              }

  //              if (!data.app_msg_list || data.app_msg_list.length === 0) {
  //                  console.log('All article parsed');
  //                  break;
  //              }

  //              app_msg_list.push(...data.app_msg_list);

  //              const result = data.app_msg_list.map((item: any) => ({
  //                  title: item.title,
  //                  link: item.link
  //              }));
  //              //todo: 获取数据库最新一条的id
  //              for (const { title, link } of result) {
  //                  if (title.includes("SAST Weekly")) {
  //                      //todo：插入数据库
  //                    }
  //                  }
  //                  j++;
  //              } catch (error) {
  //              console.error('Error fetching articles:', error);
  //          }
  //      }

  //      if (!fcontrol) {
  //        return res.status(300).send("frequency control");
  //      } else {
  //        return res.status(200).send("ok");
  //      }
  //  } catch (error) {
  //    return res.status(500).send("error");
  //  }
  //} catch (err) {
  //    return res.status(500).send("500 Internal Server Error: " + err);
  //}
})
router.get("/cover", async (req, res) => {
  try {
    if (!req.query.url) return res.status(400).send("400 Bad Request: no url provided!");
    const url: any = req.query.url;
    const useragent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3";
    const headers : HeadersInit = [
      ["User-Agent", useragent],
      ["Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"],
      ["Accept-Language", "zh-CN,zh;q=0.8,en-US;q=0.6,en;q=0.4"],
      ["Accept-Encoding", "gzip, deflate, br"],
      ["Connection", "keep-alive"],
      ["Upgrade-Insecure-Requests", "1"],
      ["Cache-Control", "max-age=0"]
    ]
    const response = await fetch(
      url,
      {
        method: "GET",
        headers: headers,
      },
    );
    console.log(response);
    if (response.ok) {
      const text: string = await response.text();
      const match = text.match(/var msg_cdn_url = "(.*?)";/);
      if (match && match[1])
        res.status(200).send(match[1]);
      else throw (Error("capture failed!"));
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
      { method: "GET" }
    );
    if (response.ok) {
      const text: string = await response.text();
      const match = text.match(/meta property="og:title" content=".*"/);
      if (match == null) throw (Error("capture failed!"));
      const title = match[0].slice(34, -1);
      return title;
    }
    else throw (Error("fetch failed!"));
  } catch (err: any) {
    return err;
  }
}

router.post("/insert",authenticate(["counselor"]), async (req, res) => {
  try {
    if (!req.body.id || !req.body.url) return res.status(400).send("400 Bad Request: not enough params!");
    const title: string = await getTitle(req.body.url);
    const QueryGreaterIds: any = await client.request(
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

router.post("/delete",authenticate(["counselor"]), async (req, res) => {
  try {
    if (!req.body.id) return res.status(400).send("400 Bad Request: not enough params!");
    const QueryGreaterIds: any = await client.request(
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

router.post("/init",authenticate(["counselor"]), async (req, res) => {
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
