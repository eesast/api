import STS from "qcloud-cos-sts";

// 获取临时密钥
const getSTS = async (action: string[], prefix: string) => {
    // 配置参数
    const config = {
        secretId: process.env.GROUP_SECRET_ID!,   // 固定密钥
        secretKey: process.env.GROUP_SECRET_KEY!,  // 固定密钥
        proxy: '',
        host: 'sts.tencentcloudapi.com',
        durationSeconds: 1800,  // 密钥有效期
        bucket: 'eesast-1255334966', // 换成你的 bucket
        region: 'ap-beijing', // 换成 bucket 所在地区
    };
    const scope = [{
        action: action,
        bucket: config.bucket,
        region: config.region,
        prefix: prefix,
    }];
    const policy = STS.getPolicy(scope);
    return new Promise((resolve, reject) => STS.getCredential({
        secretId: config.secretId,
        secretKey: config.secretKey,
        proxy: config.proxy,
        policy: policy,
        durationSeconds: config.durationSeconds,
    }, (err, credential) => {
        if (err) reject(err);
        else resolve(credential);
    }))
};

export default getSTS;
