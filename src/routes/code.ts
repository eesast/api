import express from "express";
// import Docker from "dockerode";
// import fs  from "fs/promises";
// import jwt from "jsonwebtoken";
// import { JwtPayload } from "../middlewares/authenticate";
import { gql } from "graphql-request";
import { client } from "..";
// import { getOSS } from "../helpers/oss";
// import fStream from 'fs';
const router = express.Router();

const scholarships = {
    "清华之友－华为奖学金": [
      {
        code: "J2022050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的华为技术有限公司有关人士",
      },
    ],
    "清华之友－宝钢奖学金": [
      {
        code: "J2042100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的宝钢教育基金会理事会有关人士",
      },
    ],
    "清华之友-宝钢特等奖学金": [
      {
        code: "J2042200",
        amount: 20000,
        type: "校管校分",
        salutation: "尊敬的宝钢教育基金理事会有关人士",
      },
    ],
    "清华之友－宝钢台湾、港澳学生奖学金": [
      {
        code: "J2043100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的宝钢教育基金理事会有关人士",
      },
    ],
    "清华之友－中国石油奖学金": [
      {
        code: "J2052080",
        amount: 8000,
        type: "校管校分",
        salutation: "尊敬的中国石油天然气集团公司有关人士",
      },
    ],
    "清华之友—松下奖学金": [
      {
        code: "J2062100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的中国友好和平发展基金会及松下电器公司领导",
      },
    ],
    "清华之友—承宪康纪念奖学金": [
      {
        code: "J2082100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的高英士先生",
      },
    ],
    "清华之友－蔡雄奖学金": [
      {
        code: "J2092100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的杨蔡詠芳女士、杨敏德女士、郑杨敏贤女士",
      },
    ],
    "清华之友-微臣奖学金": [
      {
        code: "J2112050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的陈琦学长",
      },
    ],
    "清华之友—WQF奖学金": [
      {
        code: "J2122100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的捐赠人",
      },
    ],
    "清华之友—先锋奖学金": [
      {
        code: "J2132100",
        amount: 10000,
        type: "校管校分",
        salutation: "清华大学英雄文化基金",
      },
    ],
    "清华之友—中国光谷奖学金": [
      {
        code: "J2142100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的武汉东湖新技术开发区管理委员会",
      },
    ],
    "清华之友—小米奖学金": [
      {
        code: "J2152100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的小米公益基金会相关人士",
      },
      {
        code: "J2152050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的小米公益基金会相关人士",
      },
    ],
    "清华之友-唐君远奖学金": [
      {
        code: "J2172070",
        amount: 7000,
        type: "校管校分",
        salutation: "尊敬的上海唐君远教育基金会",
      },
    ],
    "清华之友－高田二等奖学金": [
      {
        code: "J2182030",
        amount: 3000,
        type: "校管校分",
        salutation: "尊敬的日本SMC株式会社有关人士",
      },
    ],
    "清华之友－高田一等奖学金": [
      {
        code: "J2182050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的日本SMC株式会社有关人士",
      },
    ],
    "清华之友－高田特等奖学金": [
      {
        code: "J2182070",
        amount: 7000,
        type: "校管校分",
        salutation: "尊敬的日本SMC株式会社有关人士",
      },
    ],
    "清华之友－MUFG銀行奖学金": [
      {
        code: "J2232045",
        amount: 4500,
        type: "校管校分",
        salutation: "尊敬的三菱UFJ国际财团有关人士",
      },
    ],
    "清华之友－长兴奖学金": [
      {
        code: "J2322030",
        amount: 3000,
        type: "校管校分",
        salutation: "尊敬的长兴（广州）电子材料有限公司领导",
      },
    ],
    "清华之友—李捷参奖助学金": [
      {
        code: "J2372050",
        amount: 5000,
        type: "校管校分",
        salutation: "李捷参先生亲属",
      },
    ],
    "清华之友－黄焕猷奖学金": [
      {
        code: "J2402020",
        amount: 2000,
        type: "校管校分",
        salutation: "尊敬的黄松益先生，黄何善胜女士",
      },
    ],
    "清华之友－何王玉池奖学金": [
      {
        code: "J2412020",
        amount: 2000,
        type: "校管校分",
        salutation: "尊敬的黄松益先生，黄何善胜女士",
      },
    ],
    "清华之友－黄松益何善胜奖学金": [
      {
        code: "J2422020",
        amount: 2000,
        type: "校管校分",
        salutation: "尊敬的黄松益先生，黄何善胜女士",
      },
    ],
    "清华之友－中国航天科技CASC三等奖学金": [
      {
        code: "J2442030",
        amount: 3000,
        type: "校管校分",
        salutation: "尊敬的中国航天科技集团公司有关人士",
      },
    ],
    "清华之友－中国航天科技CASC二等奖学金": [
      {
        code: "J2442050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的中国航天科技集团公司有关人士",
      },
    ],
    "清华之友－中国航天科技CASC一等奖学金": [
      {
        code: "J2442100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的中国航天科技集团公司有关人士",
      },
    ],
    "清华之友—白晶奖学金": [
      {
        code: "J2512050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的白武明、张亦杰伉俪",
      },
    ],
    "清华之友—禾丰正则奖学金": [
      {
        code: "J2552050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的禾丰正则资产管理有限公司领导",
      },
    ],
    "清华之友—潍柴动力奖学金": [
      {
        code: "J2592030",
        amount: 3000,
        type: "校管校分",
        salutation: "尊敬的潍柴动力股份有限公司领导",
      },
      {
        code: "J2682060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的潍柴动力股份有限公司领导",
      },
      {
        code: "J2682100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的潍柴动力股份有限公司领导",
      },
    ],
    五粮液科技久久励学基金: [
      {
        code: "J2632060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的四川五粮液集团公司、北京久德励志科技有限公司",
      },
      {
        code: "J2632080",
        amount: 8000,
        type: "校管校分",
        salutation: "尊敬的四川五粮液集团公司、北京久德励志科技有限公司",
      },
      {
        code: "J2632100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的四川五粮液集团公司、北京久德励志科技有限公司",
      },
    ],
    "清华之友——张荣华奖学金": [
      {
        code: "J2642030",
        amount: 3000,
        type: "校管校分",
        salutation: "张荣华阿姨、张阿姨",
      },
      {
        code: "J2642040",
        amount: 4000,
        type: "校管校分",
        salutation: "张荣华阿姨、张阿姨",
      },
    ],
    "清华之友—东方电气奖学金": [
      {
        code: "J2662050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的中国东方电气集团有限公司领导",
      },
    ],
    "清华之友——上海华谊奖学金": [
      {
        code: "J2672040",
        amount: 4000,
        type: "校管校分",
        salutation: "尊敬的上海华谊集团股份有限公司领导",
      },
    ],
    "协鑫奖-奖学金": [
      {
        code: "J2712080",
        amount: 8000,
        type: "校管校分",
        salutation: "尊敬的协鑫集团领导",
      },
    ],
    清荷奖学金: [
      {
        code: "J2732050",
        amount: 5000,
        type: "校管校分",
        salutation: "青青女士",
      },
      {
        code: "J2732080",
        amount: 8000,
        type: "校管校分",
        salutation: "青青女士",
      },
    ],
    唐立新优秀奖学金: [
      {
        code: "J2742100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的唐先生/唐立新先生",
      },
    ],
    波音奖学金: [
      {
        code: "J2792100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的波音公司有关领导",
      },
    ],
    "清华校友－林志群奖学金": [
      {
        code: "J3042020",
        amount: 2000,
        type: "校管校分",
        salutation: "尊敬的林志群学长亲属",
      },
    ],
    "清华校友－倪天增奖学金": [
      {
        code: "J3052010",
        amount: 1000,
        type: "校管校分",
        salutation: "尊敬的倪天增教育奖励基金负责人",
      },
    ],
    "清华校友—1997级奖学基金": [
      {
        code: "J3082025",
        amount: 2500,
        type: "校管校分",
        salutation: "尊敬的1997级学长",
      },
    ],
    "清华校友－黄宪儒奖学金": [
      {
        code: "J3132030",
        amount: 3000,
        type: "校管校分",
        salutation: "尊敬的黄明宪、黄明德女士",
      },
    ],
    西南联大奖学金: [
      {
        code: "J3152100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的西南联大老学长",
      },
    ],
    夏翔纪念奖学金: [
      {
        code: "J3172050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的夏元庆、沈书府学长",
      },
    ],
    赵元任纪念奖学金: [
      {
        code: "J3182020",
        amount: 2000,
        type: "校管校分",
        salutation: "尊敬的赵新那学长",
      },
    ],
    冀朝鼎学长纪念奖学金: [
      {
        code: "J3212030",
        amount: 3000,
        type: "校管校分",
        salutation: "尊敬的冀复生学长",
      },
    ],
    西南联大1944级奖励金: [
      {
        code: "J3222015",
        amount: 1500,
        type: "校管校分",
        salutation: "尊敬的1944级学长",
      },
    ],
    "清华校友-周和平奖学基金": [
      {
        code: "J3242030",
        amount: 3000,
        type: "校管校分",
        salutation: "尊敬的周和平学长",
      },
    ],
    "清华校友—王补宣院士奖学金": [
      {
        code: "J3262050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的学长们",
      },
    ],
    清华校友过增元奖学励学基金: [
      {
        code: "J3292050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的学长们",
      },
    ],
    "清华之友—叔蘋医学奖学金": [
      {
        code: "J2842050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的叔蘋奖学金基金会爱心人士",
      },
    ],
    "清华之友—张明为奖学金": [
      {
        code: "J2072040",
        amount: 4000,
        type: "校管校分",
        salutation: "尊敬的张爷爷家属",
      },
    ],
    "中国宋庆龄基金会·中芯国际孟宁奖助学金": [
      {
        code: "J2102100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的捐赠人",
      },
    ],
    "清华之友－董氏东方奖学金": [
      {
        code: "J2162050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的香港董氏慈善基金会及东方海外货柜航运有限公司有关人士",
      },
    ],
    "清华之友－周惠琪奖学金": [
      {
        code: "J2202050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的周惠琪基金会有关人士",
      },
    ],
    "清华之友－POSCO奖学金": [
      {
        code: "J2282070",
        amount: 7000,
        type: "校管校分",
        salutation: "尊敬的POSCO青岩财团有关人士",
      },
    ],
    "清华之友－黄乾亨奖学金": [
      {
        code: "J2362020",
        amount: 2000,
        type: "校管校分",
        salutation: "尊敬的黄乾亨基金会有关人士",
      },
    ],
    "清华之友－苏州工业园区奖学金": [
      {
        code: "J2462080",
        amount: 8000,
        type: "校管校分",
        salutation: "尊敬的苏州工业园区有关人士",
      },
    ],
    "清华之友－恒大奖学金": [
      {
        code: "J2532050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的恒大集团相关人士",
      },
    ],
    工商银行奖学金: [
      {
        code: "J2542100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的工商银行有关领导",
      },
    ],
    "清华之友—深交所奖学金": [
      {
        code: "J2562050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的深交所有关领导",
      },
    ],
    国家奖学金: [{ code: "J2602080", amount: 8000, type: "校管校分" }],
    "清华之友－丰田奖学金": [
      {
        code: "J2612030",
        amount: 3000,
        type: "校管校分",
        salutation: "尊敬的丰田汽车公司有关领导",
      },
      {
        code: "J2612050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的丰田汽车公司有关领导",
      },
    ],
    "清华之友－SK奖学金": [
      {
        code: "J2622060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的SK集团有关人士",
      },
    ],
    "清华之友－三星奖学金": [
      {
        code: "J2652050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的三星(中国)投资有限公司有关人士",
      },
    ],
    唐仲英德育奖学金: [
      {
        code: "J2702040",
        amount: 4000,
        type: "校管校分",
        salutation: "",
      },
    ],
    "清华之友－郑格如奖学金": [
      {
        code: "J2722020",
        amount: 2000,
        type: "校管校分",
        salutation: "尊敬的郑格如基金会有关人士",
      },
    ],
    "清华之友——广药集团奖学金": [
      {
        code: "J2782030",
        amount: 3000,
        type: "校管校分",
        salutation: "尊敬的广州王老吉大健康产业有限公司领导",
      },
      {
        code: "J2782050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的广州王老吉大健康产业有限公司领导",
      },
    ],
    "清华之友－黄奕聪伉俪奖助学金": [
      {
        code: "J2802040",
        amount: 4000,
        type: "校管校分",
        salutation: "尊敬的黄荣年先生及夫人",
      },
    ],
    国家励志奖学金: [{ code: "J2892050", amount: 5000, type: "校管校分" }],
    "清华之友－渠玉芝奖学金": [
      {
        code: "J2902020",
        amount: 2000,
        type: "校管校分",
        salutation: "尊敬的渠玉芝教授",
      },
    ],
    蒋南翔奖学金: [
      {
        code: "J3012150",
        amount: 15000,
        type: "校管校分",
        salutation: "尊敬的蒋南翔奖学金捐赠学长们",
      },
    ],
    "一二·九奖学金": [{ code: "J3022150", amount: 15000, type: "校管校分" }],
    好读书奖学金: [
      { code: "J3032030", amount: 3000, type: "校管校分" },
      { code: "J3032080", amount: 8000, type: "校管校分" },
    ],
    "清华校友－孟昭英奖学金": [
      { code: "J3122030", amount: 3000, type: "校管校分" },
    ],
    电子系97级校友奖学金: [{ code: "J7237030", amount: 1800, type: "院管院分" }],
    电子系1998级校友奖学基金: [
      {
        code: "J7232020",
        amount: 2000,
        type: "院管院分",
        salutation: "尊敬的电子系98级奖学金捐赠人",
      },
    ],
    常锋奖学金: [
      {
        code: "J7234020",
        amount: 2000,
        type: "院管院分",
        salutation: "尊敬的常锋奖学金捐赠人",
      },
    ],
    校设奖学金: [
      { code: "J1022000", amount: 0, type: "校管院分" },
      { code: "J1022010", amount: 1000, type: "校管院分" },
      { code: "J1022020", amount: 2000, type: "校管院分" },
      { code: "J1022030", amount: 3000, type: "校管院分" },
      { code: "J1022040", amount: 4000, type: "校管院分" },
      { code: "J1022050", amount: 5000, type: "校管院分" },
    ],
    "2018级新生一等奖学金": [
      { code: "J1142125", amount: 12500, type: "校管校分" },
    ],
    "2018级新生二等奖学金": [
      { code: "J1142050", amount: 5000, type: "校管校分" },
    ],
    "2017级新生一等奖学金": [
      { code: "J1152125", amount: 12500, type: "校管校分" },
    ],
    "2017级新生二等奖学金": [
      { code: "J1152050", amount: 5000, type: "校管校分" },
    ],
    "2016级新生一等奖学金": [
      { code: "J1162125", amount: 12500, type: "校管校分" },
    ],
    "2016级新生二等奖学金": [
      { code: "J1162050", amount: 5000, type: "校管校分" },
    ],
    "2019级新生一等奖学金": [
      { code: "J1172125", amount: 12500, type: "校管校分" },
    ],
    "2019级新生二等奖学金": [
      { code: "J1172050", amount: 5000, type: "校管校分" },
    ],
  };

  const aids = {
    "清华之友－怀庄助学金": [
      {
        code: "Z2052032",
        amount: 3200,
        type: "校管校分",
        salutation: "庄人川先生、陈友忠先生等爱心人士",
      },
    ],
    清华大学生活费助学金: [
      { code: "Z2062020", amount: 2000, type: "校管校分" },
      { code: "Z2062030", amount: 3000, type: "校管校分" },
    ],
    "清华之友－励志助学金": [
      {
        code: "Z2072040",
        amount: 4000,
        type: "校管校分",
        salutation: "尊敬的陈伯佐先生",
      },
    ],
    "恒大集团助学基金(一)": [
      {
        code: "Z2122065",
        amount: 6500,
        type: "校管校分",
        salutation: "恒大集团",
      },
    ],
    恒大集团助学基金: [
      {
        code: "Z2132065",
        amount: 6500,
        type: "校管校分",
        salutation: "恒大集团",
      },
    ],
    "清华之友－黄俞助学金": [
      {
        code: "Z2152120",
        amount: 12000,
        type: "校管校分",
        salutation: "尊敬的黄俞先生",
      },
    ],
    龙门希望工程助学金: [
      {
        code: "Z2322050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的伦景光教授、伦景雄先生、伦景良先生",
      },
    ],
    清华伟新励学金: [
      {
        code: "Z2352040",
        amount: 4000,
        type: "校管校分",
        salutation: "尊敬的香港伟新教育基金会爱心人士",
      },
    ],
    "清华之友－赵敏意助学金": [
      {
        code: "Z2432100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的赵敏意女士",
      },
    ],
    "清华之友－咏芳助学金": [
      {
        code: "Z2492040",
        amount: 4000,
        type: "校管校分",
        salutation: "尊敬的杨蔡咏芳女士",
      },
    ],
    "清华大学-昱鸿助学金": [
      {
        code: "Z2552050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的吴官正学长",
      },
      {
        code: "Z2552100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的吴官正学长",
      },
    ],
    "清华之友-张明为助学金": [
      {
        code: "Z2612050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的张爷爷家属",
      },
    ],
    "清华之友－一汽丰田助学金": [
      {
        code: "Z2682050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的捐助人",
      },
    ],
    "清华校友－河南校友会励学金": [
      {
        code: "Z4262130",
        amount: 13000,
        type: "校管校分",
        salutation: "尊敬的河南校友会的学长们",
      },
    ],
    "清华校友－传信励学基金": [
      {
        code: "Z4312010",
        amount: 1000,
        type: "校管校分",
        salutation: "尊敬的学长们",
      },
      {
        code: "Z4312020",
        amount: 2000,
        type: "校管校分",
        salutation: "尊敬的学长们",
      },
      {
        code: "Z4312030",
        amount: 3000,
        type: "校管校分",
        salutation: "尊敬的学长们",
      },
    ],
    "清华校友－德强励学金": [
      {
        code: "Z4372050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的李小龙学长",
      },
    ],
    "清华校友－孟昭英励学基金": [
      {
        code: "Z4492010",
        amount: 1000,
        type: "校管校分",
        salutation: "尊敬的赵伟国学长",
      },
      {
        code: "Z4492020",
        amount: 2000,
        type: "校管校分",
        salutation: "尊敬的赵伟国学长",
      },
      {
        code: "Z4492030",
        amount: 3000,
        type: "校管校分",
        salutation: "尊敬的赵伟国学长",
      },
      {
        code: "Z4492060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的赵伟国学长",
      },
    ],
    "清华校友－常迵励学基金": [
      {
        code: "Z4502005",
        amount: 500,
        type: "校管校分",
        salutation: "尊敬的赵伟国学长",
      },
      {
        code: "Z4502010",
        amount: 1000,
        type: "校管校分",
        salutation: "尊敬的赵伟国学长",
      },
      {
        code: "Z4502015",
        amount: 1500,
        type: "校管校分",
        salutation: "尊敬的赵伟国学长",
      },
      {
        code: "Z4502020",
        amount: 2000,
        type: "校管校分",
        salutation: "尊敬的赵伟国学长",
      },
      {
        code: "Z4502050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的赵伟国学长",
      },
    ],
    "清华校友－张维国励学基金": [
      {
        code: "Z4612010",
        amount: 1000,
        type: "校管校分",
        salutation: "尊敬的张维国学长",
      },
      {
        code: "Z4612060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的张维国学长",
      },
      {
        code: "Z4612080",
        amount: 8000,
        type: "校管校分",
        salutation: "尊敬的张维国学长",
      },
      {
        code: "Z4612100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的张维国学长",
      },
    ],
    "清华校友－凌复云·马晓云励学基金": [
      {
        code: "Z4642060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的凌复云、马晓云学长",
      },
    ],
    "清华之友－华硕励学基金": [
      {
        code: "Z4922030",
        amount: 3000,
        type: "校管校分",
        salutation: "华硕集团公司",
      },
      {
        code: "Z4922050",
        amount: 5000,
        type: "校管校分",
        salutation: "华硕集团公司",
      },
    ],
    清华江西校友励学基金: [
      {
        code: "Z5392030",
        amount: 3000,
        type: "校管校分",
        salutation: "泰豪集团有限公司",
      },
      {
        code: "Z5392060",
        amount: 6000,
        type: "校管校分",
        salutation: "泰豪集团有限公司",
      },
    ],
    清华校友零零励学基金: [
      {
        code: "Z5412060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的零零字班学长们",
      },
    ],
    清华校友励学金: [
      {
        code: "Z5562100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的学长",
      },
      {
        code: "Z5562060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的学长",
      },
    ],
    "清华校友－吴道怀史常忻励学基金": [
      {
        code: "Z5712040",
        amount: 4000,
        type: "校管校分",
        salutation: "尊敬的史常忻学长",
      },
      {
        code: "Z5712060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的史常忻学长",
      },
    ],
    "清华校友－广州校友会励学金（周进波）": [
      {
        code: "Z5819060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的周进波学长",
      },
    ],
    "清华校友－代贻榘励学基金": [
      {
        code: "Z6002060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的王秉钦学长",
      },
    ],
    "清华校友－山西校友会励学基金": [
      {
        code: "Z6022060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的山西校友会的学长们",
      },
    ],
    "清华校友－李志坚励学基金": [
      {
        code: "Z6102050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的学长们",
      },
      {
        code: "Z6102100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的学长们",
      },
      {
        code: "Z6102060",
        amount: 6000,
        type: "校管校分",
        salutation: "尊敬的学长们",
      },
      {
        code: "Z6102030",
        amount: 3000,
        type: "校管校分",
        salutation: "尊敬的学长们",
      },
      {
        code: "Z6102020",
        amount: 2000,
        type: "校管校分",
        salutation: "尊敬的学长们",
      },
    ],
    珠海市得理慈善基金会清华励学金: [
      {
        code: "Z6142050",
        amount: 5000,
        type: "校管校分",
        salutation: "珠海市得理慈善基金会",
      },
      {
        code: "Z6152100",
        amount: 10000,
        type: "校管校分",
        salutation: "珠海市得理慈善基金会",
      },
    ],
    清华78届雷四班校友及苏宁电器励学基金: [
      {
        code: "Z6182050",
        amount: 5000,
        type: "校管校分",
        salutation: "尊敬的1978届雷4班的学长们及苏宁电器股份有限公司领导",
      },
    ],
    "清华校友励学金（任向军）": [
      {
        code: "Z6242120",
        amount: 12000,
        type: "校管校分",
        salutation: "尊敬的任向军学长",
      },
    ],
    "清华之友-爱心勤工助学金": [
      {
        code: "Z2022050",
        amount: 5000,
        type: "校管校分",
      },
    ],
    "清华之友-敖龙助学金": [
      {
        code: "Z2152100",
        amount: 10000,
        type: "校管校分",
        salutation: "尊敬的刘海龙先生、敖美真女士",
      },
    ],
    "“好读书”奖学金（自强专项）": [
      {
        code: "Z2602035",
        amount: 3500,
        type: "校管校分",
      },
    ],
    "清华之友－小米助学金": [
      {
        code: "Z2082050",
        amount: 5000,
        type: "校管校分",
        salutation: "北京小米公益基金会",
      },
    ],
    国家助学金: [
      { code: "Z2012020", amount: 2000, type: "校管院分" },
      { code: "Z2012030", amount: 3000, type: "校管院分" },
      { code: "Z2012050", amount: 5000, type: "校管院分" },
    ],
  }

router.post("/test", async (req, res) => {
    try {
      const dict = req.body.type === true ? aids : scholarships;
        for (let i in dict) {
            for (let j in (dict as any)[i]) {
                if (!(dict as any)[i][j].salutation) {
                  await client.request(
                    gql`
                    mutation MyMutation($IsAids: Boolean, $amount: Int, $code: String, $name: String, $type: String) {
                      insert_scholarships_aids(objects: {IsAids: $IsAids, amount: $amount, code: $code, name: $name, type: $type}) {
                        returning {
                          name
                        }
                      }
                    }
                    `,
                    {
                        amount: (dict as any)[i][j].amount,
                        code: (dict as any)[i][j].code,
                        type: (dict as any)[i][j].type,
                        name: i,
                        IsAids: req.body.type
                    }
                );
                }
                else{
                  await client.request(
                    gql`
                    mutation MyMutation($IsAids: Boolean, $amount: Int, $code: String, $name: String, $salutation: String, $type: String) {
                      insert_scholarships_aids(objects: {IsAids: $IsAids, amount: $amount, code: $code, name: $name, salutation: $salutation, type: $type}) {
                        returning {
                          name
                        }
                      }
                    }
                    `,
                    {
                        amount: (dict as any)[i][j].amount,
                        code: (dict as any)[i][j].code,
                        salutation: (dict as any)[i][j].salutation,
                        type: (dict as any)[i][j].type,
                        name: i,
                        IsAids: req.body.type
                    }
                  );
                }
            }
        }
        res.status(200).send("ok!");
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
})

// const base_directory = process.env.NODE_ENV === "production" ? '/data/thuai5/' : '/home/li-yr/';

// interface JwtCompilerPayload {
//   team_id: string;
// }

// /**
//  * POST compile code of team_id
//  * @param token (user_id)
//  * @param {uuid} req.body.team_id
//  */
// // query whether is manager, query whether is in team
// router.post("/compile", async (req, res) => {
//   try {
//     const team_id = req.body.team_id;
//     const authHeader = req.get("Authorization");
//     if (!authHeader) {
//       return res.status(401).send("401 Unauthorized: Missing token");
//     }
//     const token = authHeader.substring(7);
//     return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
//       if (err || !decoded) {
//         return res
//           .status(401)
//           .send("401 Unauthorized: Token expired or invalid");
//       }
//       const payload = decoded as JwtPayload;
//       const user_id = payload._id;
//       const query_if_manager = await client.request(
//         gql`
//           query query_is_manager($contest_id: uuid, $user_id: String) {
//             contest_manager(where: {_and: {contest_id: {_eq: $contest_id}, user_id: {_eq: $user_id}}}) {
//               user_id
//             }
//           }
//         `,
//         { contest_id: process.env.GAME_ID, user_id: user_id }
//       );
//       const is_manager = query_if_manager.contest_manager.lenth != 0;
//       if (!is_manager) {
//         try {
//           const query_in_team = await client.request(
//             gql`
//               query query_if_in_team($team_id: uuid, $user_id: String, $contest_id: uuid) {
//                 contest_team(
//                   where: {
//                     _and: [
//                       { contest_id: { _eq: $contest_id } }
//                       { team_id: { _eq: $team_id } }
//                       {
//                         _or: [
//                           { team_leader: { _eq: $user_id } }
//                           { contest_team_members: { user_id: { _eq: $user_id } } }
//                         ]
//                       }
//                     ]
//                   }
//                 ) {
//                   team_id
//                 }
//               }
//             `,
//             {contest_id: process.env.GAME_ID, team_id: team_id, user_id: user_id}
//           );
//           const is_in_team = query_in_team.contest_team.length != 0;
//           if (!is_in_team) return res.status(401).send("当前用户不在队伍中");
//         } catch (err) {
//           return res.status(400).send(err);
//         }
//       }
//       try {
//         try {
//           await fs.mkdir(`${base_directory}/${team_id}`, {
//             recursive: true,
//             mode: 0o775,
//           });
//         } catch (err) {
//           return res.status(400).send("文件存储目录创建失败");
//         }
//         try {
//           const oss = await getOSS();
//           const result1 = await oss.getStream(`/THUAI5/${team_id}/player1.cpp`);
//           const result2 = await oss.getStream(`/THUAI5/${team_id}/player2.cpp`);
//           const result3 = await oss.getStream(`/THUAI5/${team_id}/player3.cpp`);
//           const result4 = await oss.getStream(`/THUAI5/${team_id}/player4.cpp`);
//           const writeStream1 = fStream.createWriteStream(`${base_directory}/${team_id}/player1.cpp`);
//           result1.stream.pipe(writeStream1);
//           const writeStream2 = fStream.createWriteStream(`${base_directory}/${team_id}/player2.cpp`);
//           result2.stream.pipe(writeStream2);
//           const writeStream3 = fStream.createWriteStream(`${base_directory}/${team_id}/player3.cpp`);
//           result3.stream.pipe(writeStream3);
//           const writeStream4 = fStream.createWriteStream(`${base_directory}/${team_id}/player4.cpp`);
//           result4.stream.pipe(writeStream4);
//         } catch (err) {
//           return res.status(400).send(`OSS选手代码下载失败:${err}`);
//         }
//         const docker =
//           process.env.DOCKER === "remote"
//             ? new Docker({
//                 host: process.env.DOCKER_URL,
//                 port: process.env.DOCKER_PORT,
//               })
//             : new Docker();
//         let containerRunning = false;
//         try {
//           const containerList = await docker.listContainers();
//           containerList.forEach((containerInfo) => {
//             if (containerInfo.Names.includes(`/THUAI5_Compiler_${team_id}`)) {
//               containerRunning = true;
//             }
//           });
//           if (!containerRunning) {
//             const url =
//                 process.env.NODE_ENV == "production"
//                   ? "https://api.eesast.com/code/compileInfo"
//                   : "http://172.17.0.1:28888/code/compileInfo";
//             const compiler_token = jwt.sign(
//               {
//                 team_id: team_id,
//               } as JwtCompilerPayload,
//               process.env.SECRET!,
//               {
//                 expiresIn: "10m",
//               }
//             );
//             const container = await docker.createContainer({
//               Image: process.env.COMPILER_IMAGE,
//               Env: [
//                 `URL=${url}`,
//                 `TOKEN=${compiler_token}`
//               ],
//               HostConfig: {
//                 Binds: [`${base_directory}/${team_id}:/usr/local/mnt`],
//                 AutoRemove: true,
//                 NetworkMode: "host"
//               },
//               AttachStdin: false,
//               AttachStdout: false,
//               AttachStderr: false,
//               //StopTimeout: parseInt(process.env.MAX_COMPILER_TIMEOUT as string),
//               name: `THUAI5_Compiler_${team_id}`
//             });
//             await client.request(
//               gql`
//                 mutation update_compile_status(
//                   $team_id: uuid!
//                   $status: String
//                   $contest_id: uuid
//                 ) {
//                   update_contest_team(where: {_and: {contest_id: {_eq: $contest_id}, team_id: {_eq: $team_id}}}, _set: {status: $status}) {
//                     returning {
//                       status
//                     }
//                   }
//                 }
//               `,
//               {
//                 contest_id: process.env.GAME_ID,
//                 team_id: team_id,
//                 status: "compiling",
//               }
//             );
//             await container.start();
//           }
//         } catch (err) {
//           return res.status(400).send(err);
//         }
//       } catch (err) {
//         return res.status(400).send(err);
//       }
//       return res.status(200).send("ok!");
//     });
//   } catch (err) {
//     return res.send(err);
//   }
// });

// /**
//  * PUT compile info
//  */
// router.put("/compileInfo", async (req, res) => {
//   try {
//     const authHeader = req.get("Authorization");
//     if (!authHeader) {
//       return res.status(401).send("401 Unauthorized: Missing token");
//     }

//     const token = authHeader.substring(7);
//     return jwt.verify(token, process.env.SECRET!, async (err, decoded) => {
//       if (err || !decoded) {
//         return res
//           .status(401)
//           .send("401 Unauthorized: Token expired or invalid");
//       }

//       const payload = decoded as JwtCompilerPayload;
//       const team_id = payload.team_id;
//       const compile_status: string = req.body.compile_status;
//       console.log(`${team_id}:compile:${compile_status}`);
//       if (compile_status != "compiled" && compile_status != "failed")
//         return res.status(400).send("error: implicit compile status");
//       try {
//         await client.request(
//           gql`
//             mutation update_compile_status($team_id: uuid!, $status: String, $contest_id: uuid) {
//               update_contest_team(where: {_and: [{contest_id: {_eq: $contest_id}}, {team_id: {_eq: $team_id}}]}, _set: {status: $status}) {
//                 returning {
//                   status
//                 }
//               }
//             }
//           `,
//           {
//             contest_id: process.env.GAME_ID,
//             team_id: team_id,
//             status: compile_status,
//           }
//         );
//         return res.status(200).send("compile_info ok!");
//       } catch (err) {
//         return res.status(400).send(err);
//       }
//     });
//   } catch (err) {
//     return res.status(400).send(err);
//   }
// });

// /**
//  * GET compile logs
//  * @param {token}
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

//     const payload = decoded as JwtPayload;
//     const user_id = payload._id;
//     const team_id = req.params.team_id;
//     const usr_seq = req.params.usr_seq;
//     const query_if_manager = await client.request(
//       gql`
//         query query_is_manager($contest_id: uuid, $user_id: String) {
//           contest_manager(where: {_and: {contest_id: {_eq: $contest_id}, user_id: {_eq: $user_id}}}) {
//             user_id
//           }
//         }
//       `,
//       { contest_id: process.env.GAME_ID, user_id: user_id }
//     );
//     const is_manager = query_if_manager.contest_manager != null;
//     if (is_manager) {
//       const query_if_team_exists = await client.request(
//         gql`
//           query query_team_exists($contest_id: uuid, $team_id: uuid!) {
//             contest_team(where: {_and: {contest_id: {_eq: $contest_id}, team_id: {_eq: $team_id}}}) {
//               team_id
//             }
//           }
//         `,
//         { contest_id: process.env.GAME_ID, team_id: team_id }
//       );
//       const team_exists = query_if_team_exists.contest_team != null;
//       if (team_exists) {
//         try {
//           res.set("Cache-Control", "no-cache");
//           res.set("Expires", "0");
//           res.set("Pragma", "no-cache");
//           return res
//             .status(200)
//             .sendFile(`${base_directory}/${team_id}/compile_log${usr_seq}.txt`, {
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
//             query query_if_in_team($team_id: uuid, $user_id: String, $contest_id: uuid) {
//               contest_team(
//                 where: {
//                   _and: [
//                     { contest_id: { _eq: $contest_id } }
//                     { team_id: { _eq: $team_id } }
//                     {
//                       _or: [
//                         { team_leader: { _eq: $user_id } }
//                         { contest_team_members: { user_id: { _eq: $user_id } } }
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
//             contest_id: process.env.GAME_ID,
//             team_id: team_id,
//             user_id: user_id,
//           }
//         );
//         const is_in_team = query_in_team.thuai.length != 0;
//         if (is_in_team) {
//           res.set("Cache-Control", "no-cache");
//           res.set("Expires", "0");
//           res.set("Pragma", "no-cache");
//           return res
//             .status(200)
//             .sendFile(`${base_directory}/${team_id}/compile_log${usr_seq}.txt`, {
//               cacheControl: false,
//             });
//         } else
//           return res.status(401).send("401 Unauthorized:Permission denied");
//       } catch (err) {
//         return res.status(400).send(err);
//       }
//     }
//   });
// });

export default router;
