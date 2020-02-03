/*
 *没有必要存留长期的密钥，理由如下
 *需要先拿到密钥（公钥），然后请求token最后鉴权
 */
import nodeRsa from "node-rsa";
const rsaKey = new nodeRsa({ b: 1024 });
const publicKey = rsaKey.exportKey("pkcs8-public-pem");
const privateKey = rsaKey.exportKey("pkcs8-private-pem");

export { publicKey, privateKey };
