const baseMentorAppllicationTemplate = (
  header: string,
  content: string,
  url: string,
  tipText: string,
  buttonText: string,
) => {
  return `
    <!doctype html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">

    <head>
    <title> </title>
    <!--[if !mso]><!-- -->
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--<![endif]-->
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style type="text/css">
        #outlook a {
        padding: 0;
        }

        body {
        margin: 0;
        padding: 0;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        }

        table,
        td {
        border-collapse: collapse;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
        }

        img {
        border: 0;
        height: auto;
        line-height: 100%;
        outline: none;
        text-decoration: none;
        -ms-interpolation-mode: bicubic;
        }

        p {
        display: block;
        margin: 13px 0;
        }
    </style>
    <!--[if mso]>
            <xml>
            <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
            </xml>
            <![endif]-->
    <!--[if lte mso 11]>
            <style type="text/css">
            .outlook-group-fix { width:100% !important; }
            </style>
            <![endif]-->
    <style type="text/css">
        @media only screen and (min-width:480px) {
        .mj-column-per-100 {
            width: 100% !important;
            max-width: 100%;
        }
        }
    </style>
    <style type="text/css">
        @media only screen and (max-width:480px) {
        table.full-width-mobile {
            width: 100% !important;
        }
        td.full-width-mobile {
            width: auto !important;
        }
        }
    </style>
    </head>

    <body style="background-color:#eeeeee;">
    <div style="background-color:#eeeeee;">
        <!--[if mso | IE]>
        <table
            align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600"
        >
            <tr>
            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
        <![endif]-->
        <div style="margin:0px auto;max-width:600px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
            <tbody>
            <tr>
                <td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;">
                <!--[if mso | IE]>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">

            <tr>

                <td
                class="" style="vertical-align:top;width:600px;"
                >
            <![endif]-->
                <div class="mj-column-per-100 outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                    <tr>
                        <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                            <tbody>
                            <tr>
                                <td style="width:75px;"> <img height="auto" src="${process.env.LOGO_URL}" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="75" /> </td>
                            </tr>
                            </tbody>
                        </table>
                        </td>
                    </tr>
                    </table>
                </div>
                <!--[if mso | IE]>
                </td>

            </tr>

                    </table>
                    <![endif]-->
                </td>
            </tr>
            </tbody>
        </table>
        </div>
        <!--[if mso | IE]>
            </td>
            </tr>
        </table>

        <table
            align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600"
        >
            <tr>
            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
        <![endif]-->
        <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
            <tbody>
            <tr>
                <td style="direction:ltr;font-size:0px;padding:48px 0px;text-align:center;">
                <!--[if mso | IE]>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">

            <tr>

                <td
                class="" style="vertical-align:top;width:600px;"
                >
            <![endif]-->
                <div class="mj-column-per-100 outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                    <tr>
                        <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';font-size:18px;line-height:1.4;text-align:left;color:#000000;">${header}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="font-size:0px;word-break:break-word;">
                        <!--[if mso | IE]>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td height="20" style="vertical-align:top;height:20px;">

        <![endif]-->
                        <div style="height:20px;"> &nbsp; </div>
                        <!--[if mso | IE]>

            </td></tr></table>

        <![endif]-->
                        </td>
                    </tr>
                    <tr>
                        <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';font-size:18px;line-height:1.4;text-align:left;color:#000000;">${content}</div>
                        </td>
                    </tr>
                    <tr>
                        <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';font-size:18px;line-height:1.4;text-align:left;color:#000000;">${tipText}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="font-size:0px;word-break:break-word;">
                        <!--[if mso | IE]>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td height="20" style="vertical-align:top;height:20px;">

        <![endif]-->
                        <div style="height:20px;"> &nbsp; </div>
                        <!--[if mso | IE]>

            </td></tr></table>

        <![endif]-->
                        </td>
                    </tr>
                    <tr>
                        <td align="center" vertical-align="middle" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                            <tr>
                            <td align="center" bgcolor="#027dcd" role="presentation" style="border:none;border-radius:3px;cursor:auto;mso-padding-alt:10px 25px;background:#027dcd;" valign="middle"> <a href="${url}" style="display:inline-block;background:#027dcd;color:white;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';font-size:18px;font-weight:normal;line-height:1.4;margin:0;text-decoration:none;text-transform:none;padding:10px 25px;mso-padding-alt:0px;border-radius:3px;"
                                target="_blank">
                ${buttonText}
                </a> </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    </table>
                </div>
                <!--[if mso | IE]>
                </td>

            </tr>

                    </table>
                    <![endif]-->
                </td>
            </tr>
            </tbody>
        </table>
        </div>
        <!--[if mso | IE]>
            </td>
            </tr>
        </table>

        <table
            align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600"
        >
            <tr>
            <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
        <![endif]-->
        <div style="margin:0px auto;max-width:600px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
            <tbody>
            <tr>
                <td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;">
                <!--[if mso | IE]>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">

            <tr>

                <td
                class="" style="vertical-align:top;width:600px;"
                >
            <![endif]-->
                <div class="mj-column-per-100 outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                    <tr>
                        <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                        <div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';font-size:18px;line-height:1.4;text-align:center;color:#000000;">© 2024 EESAST</div>
                        </td>
                    </tr>
                    </table>
                </div>
                <!--[if mso | IE]>
                </td>

            </tr>

                    </table>
                    <![endif]-->
                </td>
            </tr>
            </tbody>
        </table>
        </div>
        <!--[if mso | IE]>
            </td>
            </tr>
        </table>
        <![endif]-->
    </div>
    </body>
    </html>
    `;
};

const baseVerificationTemplate = (
  header: string,
  content: string,
  code: string,
  tipText: string,
) => {
  return `
  <!doctype html>
  <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">

  <head>
  <title> </title>
  <!--[if !mso]><!-- -->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style type="text/css">
      #outlook a {
      padding: 0;
      }

      body {
      margin: 0;
      padding: 0;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      }

      table,
      td {
      border-collapse: collapse;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
      }

      img {
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
      }

      p {
      display: block;
      margin: 13px 0;
      }
  </style>
  <!--[if mso]>
          <xml>
          <o:OfficeDocumentSettings>
          <o:AllowPNG/>
          <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
          </xml>
          <![endif]-->
  <!--[if lte mso 11]>
          <style type="text/css">
          .outlook-group-fix { width:100% !important; }
          </style>
          <![endif]-->
  <style type="text/css">
      @media only screen and (min-width:480px) {
      .mj-column-per-100 {
          width: 100% !important;
          max-width: 100%;
      }
      }
  </style>
  <style type="text/css">
      @media only screen and (max-width:480px) {
      table.full-width-mobile {
          width: 100% !important;
      }
      td.full-width-mobile {
          width: auto !important;
      }
      }
  </style>
  </head>

  <body style="background-color:#eeeeee;">
  <div style="background-color:#eeeeee;">
      <!--[if mso | IE]>
      <table
          align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600"
      >
          <tr>
          <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
      <![endif]-->
      <div style="margin:0px auto;max-width:600px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
          <tbody>
          <tr>
              <td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;">
              <!--[if mso | IE]>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">

          <tr>

              <td
              class="" style="vertical-align:top;width:600px;"
              >
          <![endif]-->
              <div class="mj-column-per-100 outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                  <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;border-spacing:0px;">
                          <tbody>
                          <tr>
                              <td style="width:75px;"> <img height="auto" src="${process.env.LOGO_URL}" style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;font-size:13px;" width="75" /> </td>
                          </tr>
                          </tbody>
                      </table>
                      </td>
                  </tr>
                  </table>
              </div>
              <!--[if mso | IE]>
              </td>

          </tr>

                  </table>
                  <![endif]-->
              </td>
          </tr>
          </tbody>
      </table>
      </div>
      <!--[if mso | IE]>
          </td>
          </tr>
      </table>

      <table
          align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600"
      >
          <tr>
          <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
      <![endif]-->
      <div style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:600px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%;">
          <tbody>
          <tr>
              <td style="direction:ltr;font-size:0px;padding:48px 0px;text-align:center;">
              <!--[if mso | IE]>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">

          <tr>

              <td
              class="" style="vertical-align:top;width:600px;"
              >
          <![endif]-->
              <div class="mj-column-per-100 outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                  <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                      <div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';font-size:18px;line-height:1.4;text-align:left;color:#000000;">${header}</div>
                      </td>
                  </tr>
                  <tr>
                      <td style="font-size:0px;word-break:break-word;">
                      <!--[if mso | IE]>

          <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td height="20" style="vertical-align:top;height:20px;">

      <![endif]-->
                      <div style="height:20px;"> &nbsp; </div>
                      <!--[if mso | IE]>

          </td></tr></table>

      <![endif]-->
                      </td>
                  </tr>
                  <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                      <div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';font-size:18px;line-height:1.4;text-align:left;color:#000000;">${content}</div>
                      </td>
                  </tr>
                  <tr>
                      <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                      <div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';font-size:18px;line-height:1.4;text-align:left;color:#000000;">${tipText}</div>
                      </td>
                  </tr>
                  <tr>
                      <td style="font-size:0px;word-break:break-word;">
                      <!--[if mso | IE]>

          <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td height="20" style="vertical-align:top;height:20px;">

      <![endif]-->
                      <div style="height:20px;"> &nbsp; </div>
                      <!--[if mso | IE]>

          </td></tr></table>

      <![endif]-->
                      </td>
                  </tr>
                  <tr>
                      <td align="center" vertical-align="middle" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                      <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%;">
                          <tr>
                          <td>
                              <div style="font-size:40px;letter-spacing:15px;line-height:40px;text-align:center;color:#000000;background-color:#ffffff;">${code}</div>
                          </td>
                          </tr>
                      </table>
                      </td>
                  </tr>
                  </table>
              </div>
              <!--[if mso | IE]>
              </td>

          </tr>

                  </table>
                  <![endif]-->
              </td>
          </tr>
          </tbody>
      </table>
      </div>
      <!--[if mso | IE]>
          </td>
          </tr>
      </table>

      <table
          align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600"
      >
          <tr>
          <td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;">
      <![endif]-->
      <div style="margin:0px auto;max-width:600px;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
          <tbody>
          <tr>
              <td style="direction:ltr;font-size:0px;padding:20px 0;text-align:center;">
              <!--[if mso | IE]>
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">

          <tr>

              <td
              class="" style="vertical-align:top;width:600px;"
              >
          <![endif]-->
              <div class="mj-column-per-100 outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                  <tr>
                      <td align="center" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                      <div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';font-size:18px;line-height:1.4;text-align:center;color:#000000;">© 2024 EESAST</div>
                      </td>
                  </tr>
                  </table>
              </div>
              <!--[if mso | IE]>
              </td>

          </tr>

                  </table>
                  <![endif]-->
              </td>
          </tr>
          </tbody>
      </table>
      </div>
      <!--[if mso | IE]>
          </td>
          </tr>
      </table>
      <![endif]-->
  </div>
  </body>
  </html>
  `;
};

export const verifyEmailTemplate = (verificationCode: string) => {
  return baseVerificationTemplate(
    "亲爱的用户：",
    "请在 10 分钟内验证您的注册邮箱。如果这不是您本人的操作，请忽略本邮件。",
    verificationCode,
    "这是您的验证码：",
  );
};

export const resetPasswordTemplate = (verificationCode: string) => {
  return baseVerificationTemplate(
    "亲爱的用户：",
    "我们最近收到了您希望重置密码的请求，请在 10 分钟内完成重置密码操作。如果这不是您本人的操作，请忽略本邮件。",
    verificationCode,
    "这是您的验证码：",
  );
};

export const newMentorApplicationTemplate = (
  mentorName: string,
  studentName: string,
  url: string,
) => {
  return baseMentorAppllicationTemplate(
    `尊敬的${mentorName}老师：`,
    `${studentName}同学向您提交了新生导师申请，请您尽早查看并处理。`,
    url,
    "您可以点击以下按钮查看申请：",
    "查看申请",
  );
};

export const newMentorApplicationTalkTemplate = (
  mentorName: string,
  studentName: string,
  url: string,
) => {
  return baseMentorAppllicationTemplate(
    `尊敬的${mentorName}老师：`,
    `${studentName}同学提交了新生导师谈话记录，请您尽早查看并确认。`,
    url,
    "您可以点击以下按钮查看申请：",
    "查看申请",
  );
};

export const newMentorApplicationMemberTalkTemplate = (
  mentorName: string,
  studentName: string,
  url: string,
) => {
  return baseMentorAppllicationTemplate(
    `尊敬的${mentorName}老师：`,
    `${studentName}同学提交了积极分子谈话记录，请您尽早查看并确认。`,
    url,
    "您可以点击以下按钮查看申请：",
    "查看申请",
  );
};

export const updateMentorApplicationTemplate = (
  mentorName: string,
  studentName: string,
  url: string,
) => {
  return baseMentorAppllicationTemplate(
    `亲爱的${studentName}：`,
    `您的新生导师申请（${mentorName}老师）的状态已更新，请及时查看。`,
    url,
    "您可以点击以下按钮查看申请：",
    "查看申请",
  );
};

export const updateMentorApplicationTalkTemplate = (
  mentorName: string,
  studentName: string,
  url: string,
) => {
  return baseMentorAppllicationTemplate(
    `亲爱的${studentName}：`,
    `您提交的新生导师谈话记录（${mentorName}老师）已得到确认。`,
    url,
    "您可以点击以下按钮查看申请：",
    "查看申请",
  );
};

export const updateMentorApplicationMemberTalkTemplate = (
  mentorName: string,
  studentName: string,
  url: string,
) => {
  return baseMentorAppllicationTemplate(
    `亲爱的${studentName}：`,
    `您提交的积极分子谈话记录（${mentorName}老师）已得到确认。`,
    url,
    "您可以点击以下按钮查看申请：",
    "查看申请",
  );
};

export const messageReceiveTemplate = (
  fromName: string,
  toName: string,
  url: string,
) => {
  return baseMentorAppllicationTemplate(
    `亲爱的${toName}：`,
    `您收到了一条来自新生导师项目${fromName}的消息，请及时查看并回复。`,
    url,
    "您可以点击以下按钮查看消息：",
    "查看消息",
  );
};
