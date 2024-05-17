import UniSMS from 'unisms'

export const sendMessageVerifyCode = async (phone: string, code: string, ttl: number) => {
    const sms_client = new UniSMS({
        accessKeyId: process.env.SMS_ACCESS_KEY_ID!,
      })
    return sms_client.send({
        to: phone,
        signature: '电子系学习心得',
        templateId: 'pub_verif_ttl2',
        templateData: {
            code: code,
            ttl: ttl,
        },
    });
}
