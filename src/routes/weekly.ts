import express from "express";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const authHeader = req.get("Authorization");
        if (!authHeader) {
            return res.status(401).send("401 Unauthorized: Missing token");
        }
        const token = authHeader.substring(7);
        return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
            if (err || !decoded) {
                return res
                .status(401)
                .send("401 Unauthorized: Token expired or invalid");
            }
            const response = await fetch(
                req.body.url,
                { method: "GET"}
            );
            if (response.ok) {
                const text: string = await response.text();
                const match = text.match(/var msg_cdn_url.*1:1/);
                if (match == null) throw(Error("capture failed!"));
                const url1 = match[0].match(/http:\/\/.*=png/);
                const url2 = match[0].match(/http:\/\/.*=jpeg/);
                return res.status(200).send(url1 == null ? url2 : url1);
            }
            else return res.status(500).send("500 Internal Server Error: fetch failed!");
        })
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
