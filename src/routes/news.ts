import express from "express";
import axios from "axios";

const router = express.Router();

// 清华大学电子工程系“图片新闻”页面
const NEWS_PAGE_URL = "https://www.ee.tsinghua.edu.cn/dzxw/tpxw.htm";
// 首页电子新闻轮播新增的成员数量
const NEWS_SLIDE_COUNT = 2;
// 缓存有效期，避免每次访问首页都去抓取电子系主页
const CACHE_TTL = 10 * 60 * 1000;

export interface NewsSlide {
  image: string;
  title: string;
  content: string;
  link: string;
}

interface NewsCache {
  slides: NewsSlide[];
  updatedAt: number;
}

let cache: NewsCache | null = null;
let pending: Promise<NewsSlide[]> | null = null;

const decodeHtmlEntities = (text: string): string =>
  text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");

// 去掉标签、还原实体并压缩空白，得到用于展示的纯文本
const toPlainText = (html: string): string =>
  decodeHtmlEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const toAbsoluteUrl = (url: string): string => {
  try {
    return new URL(decodeHtmlEntities(url.trim()), NEWS_PAGE_URL).href;
  } catch {
    return "";
  }
};

// 大文字说明：以“新闻｜”开头的补上“电子”，其余统一加上“电子新闻｜”
const formatTitle = (title: string): string =>
  title.startsWith("新闻｜") ? `电子${title}` : `电子新闻｜${title}`;

export const parseNewsSlides = (html: string): NewsSlide[] => {
  // 先定位新闻列表，再从中取前两个新闻板块
  const listMatch = html.match(/<ul class="ul-listx1">([\s\S]*?)<\/ul>/i);
  if (!listMatch) return [];

  const blocks = [
    ...listMatch[1].matchAll(/<div class="con">([\s\S]*?)<\/li>/gi),
  ];
  const slides: NewsSlide[] = [];
  for (const block of blocks.slice(0, NEWS_SLIDE_COUNT)) {
    const body = block[1];
    const imageMatch = body.match(
      /<div class="pic">[\s\S]*?<img[^>]*\bsrc="([^"]+)"/i,
    );
    const picLinkMatch = body.match(
      /<div class="pic">[\s\S]*?<a[^>]*\bhref="([^"]+)"/i,
    );
    const titleMatch = body.match(
      /<div class="txt">[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i,
    );
    const descMatch = body.match(/<div class="desc">([\s\S]*?)<\/div>/i);

    const titleHtml = titleMatch ? titleMatch[1] : "";
    const titleLinkMatch = titleHtml.match(/<a[^>]*\bhref="([^"]+)"/i);
    const image = imageMatch ? toAbsoluteUrl(imageMatch[1]) : "";
    const link = toAbsoluteUrl(
      (titleLinkMatch ? titleLinkMatch[1] : "") ||
        (picLinkMatch ? picLinkMatch[1] : ""),
    );
    const content = descMatch ? toPlainText(descMatch[1]) : "";
    const title = toPlainText(titleHtml);

    if (!image || !link || !title) continue;
    slides.push({ image, title: formatTitle(title), content, link });
  }
  return slides;
};

const fetchNewsSlides = async (): Promise<NewsSlide[]> => {
  const response = await axios.get<string>(NEWS_PAGE_URL, {
    timeout: 10000,
    responseType: "text",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  return parseNewsSlides(response.data);
};

const getNewsSlides = async (): Promise<NewsSlide[]> => {
  if (cache && Date.now() - cache.updatedAt < CACHE_TTL) return cache.slides;
  // 同一时刻只发起一次抓取，避免并发请求重复访问电子系主页
  if (!pending) {
    pending = fetchNewsSlides()
      .then((slides) => {
        cache = { slides, updatedAt: Date.now() };
        return slides;
      })
      .finally(() => {
        pending = null;
      });
  }
  try {
    return await pending;
  } catch (err) {
    // 抓取失败时退回上一份缓存，保证首页不受影响
    if (cache) {
      console.error("Failed to refresh the EE image news, using cache:", err);
      return cache.slides;
    }
    throw err;
  }
};

router.get("/image", async (req, res) => {
  try {
    const slides = await getNewsSlides();
    res.set("Cache-Control", `public, max-age=${Math.floor(CACHE_TTL / 1000)}`);
    return res.status(200).send(slides);
  } catch (err) {
    console.error("Failed to get the EE image news:", err);
    return res
      .status(502)
      .send({ error: "Failed to get the image news from the EE website" });
  }
});

export default router;
