import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
// import recaptcha from "../middlewares/recaptcha";
import { sendEmail } from "../helpers/email";
import {
  verifyEmailTemplate,
} from "../helpers/htmlTemplates";
import authenticate, { JwtUserPayload, JwtVerifyPayload } from "../middlewares/authenticate";
import { validateEmail, validatePassword } from "../helpers/validate";
import { gql } from "graphql-request";
import { client } from "..";
const router = express.Router();
/*
`/user/login`：处理用户登录。根据`username/email/phone/student_no`从`hasura`的`users`表查找用户，并验证密码是否匹配，若验证成功，则返回`token`
- 请求方法：`POST`
- 请求：`body`中有`{user: string, password: string}`，其中`user`可以是`username/email/phone/student_no`中任一形式（可以先支持其中一两种），`password`是`bcrypt`加密后的。
- 响应：`data`中有`{token: string}`，为`JwtUserPayload`形式
*/
router.post("/login", async (req, res) => {
  const { user, password } = req.body;
  if (!user || !password) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing user or password");
  }
  try {
    let item: any = {};
    if (user.includes("@")){
      item = await client.request(
        gql`
          query MyQuery($email: String) {
            users(where: {email: {_eq: $email}}) {
              password
              id
              role
              uuid
            }
          }
        `,
        {
          email: user
        }
      );
    }
    if (!item) {
      return res.status(404).send("404 Not Found: User does not exist");
    }
    item = item.users[0];
    // console.log(JSON.stringify(item));
    const valid = await bcrypt.compare(password, item.password);
    if (!valid) {
      console.log("password wrong")
      return res.status(401).end();
    }
    const payload: JwtUserPayload = {
      uuid: item.uuid,
      role: item.role,
      _id: item.id,
      "https://hasura.io/jwt/claims": {
        "x-hasura-allowed-roles": [item.role],
        "x-hasura-default-role": item.role,
        "x-hasura-user-id": item.uuid,
      },
    };
    const token = jwt.sign(payload, process.env.SECRET!, {
      expiresIn: "24h",
    });
    return res
      .status(200)
      .json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
});
/*
`/user/verify`：发送验证码。向提供的`email/phone`发送验证码（不需要验证是否在`users`表中），同时返回一个包含`hash`之后的验证码的、生存时间更短的`token`
- 请求方法：`POST`
- 请求：`body`中有`{email: string}`或`{phone: string}`
- 响应：`data`中有`{token: string}`，为`JwtVerifyPayload`形式
- 备注：需思考如何防止高频请求（前端会有倒计时，但不够）
*/
router.post("/send-code", async(req, res) => {
  const { email, phone } = req.body;
  if (!email && !phone) {
    return res.status(422).send("422 Unprocessable Entity: Missing email or phone");
  }
  // 生成6位验证码
  const verificationCode = Math.floor(100000 + Math.random() * 900000);
  console.log("verficationCode = " + verificationCode);
  const code = await bcrypt.hash(String(verificationCode), 10);
  const token = jwt.sign(
    {
      email,
      phone,
      code
    } as JwtVerifyPayload,
    process.env.SECRET!,
    {
      expiresIn: "10m",
    }
  );
  if (email) {
    try{
      await sendEmail(
        email,
        "验证您的邮箱",
        verifyEmailTemplate(verificationCode.toString())
      );
    } catch (err) {
      console.error(err);
      return res.status(500).send(err);
    }
  }
  else if (phone) {
    // wait to be implemented
  }
  res.status(200).json({token});
});
/*
`/user/verify`：前端输完验证码之后会发送请求检验验证码是否正确
- 请求方法：`POST`
- 请求：`body`中有{verificationCode:string, verificationToken:string}
- 响应：检验成功状态码200，失败401，res.status(xxx).end()就行
*/
router.post("/verify",async(req,res) =>{
  const { verificationCode, verificationToken } = req.body;
  if (!verificationCode || !verificationToken) {
    return res.status(422).send("422 Unprocessable Entity: Missing verificationCode or verificationToken");
  }
  try {
      const decoded = jwt.verify(verificationToken, process.env.SECRET!) as JwtVerifyPayload;
      const valid = await bcrypt.compare(verificationCode, decoded.code);
      if (!valid) {
        return res.status(401).send("401 Unauthorized: Verification code does not match");
      }
      return res.status(200).end();
  } catch (err) {
      console.error(err);
      return res.status(500).send(err);
  }
})
/*
`/user/register`：创建用户。先验证请求中的验证码与`verificationToken`中的是否一致，再根据`email/phone`和`password`在`hasura`的`users`表中插入新行，并返回`token`
- 请求方法：`POST`
- 请求：`body`中有`{password: string, verificationCode: string, verificationToken: string}`，`password`是明文，`verificationCode`是6位明文验证码，`verificationToken`是`/user/verify`返回的
- 响应：`data`中有`{token: string}`，为`JwtUserPayload`形式，初始`role`应为`user`
*/
router.post("/register", async(req, res) => {
  const { password, verificationCode, verificationToken } = req.body;
  if (!password || !verificationCode || !verificationToken) {
    return res.status(422).send("422 Unprocessable Entity: Missing password or verificationCode or verificationToken");
  }
  try {
    const decoded = jwt.verify(verificationToken, process.env.SECRET!) as JwtVerifyPayload;
    if (!decoded.email && !decoded.phone) {
      return res.status(422).send("422 Unprocessable Entity: Missing email or phone");
    }
    //查询数据库中是否已存在该用户的email或phone
    const userExist = await client.request(
      gql`
        query MyQuery($email: String, $phone: String) {
          users(where: {_or: {email: {_eq: $email}, phone: {_eq: $phone}}}) {
            uuid
          }
        }
      `,
      {
        email: decoded.email || "AvoidNull",
        phone: decoded.phone || "AvoidNull"
      }
    );
    if (userExist.users.length !== 0) {
      return res.status(409).send("409 Conflict: User already exists");
    }
    const valid = await bcrypt.compare(verificationCode, decoded.code);
    if (!valid) {
      return res.status(401).send("401 Unauthorized: Verification code does not match");
    }
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    // graphql mutation, set role to user, password to password_hash, email to decoded.email, phone to decoded.phone
    const userInsert = await client.request(
      gql`
        mutation MyMutation($email: String, $phone: String, $password: String!) {
          insert_users_one(object: {email: $email, phone: $phone, password: $password, role: "user"}) {
            uuid
          }
        }
      `,
      {
        email: decoded.email,
        phone: decoded.phone,
        password: password_hash
      }
    );
    // graphql mutation, set id to uuid
    await client.request(
      gql`
        mutation MyMutation($uuid: uuid!, $id: String!) {
          update_users_by_pk(pk_columns: {uuid: $uuid}, _set: {id: $id}) {
            id
          }
        }
      `,
      {
        uuid: userInsert.insert_users_one.uuid,
        id: userInsert.insert_users_one.uuid
      }
    );
    // sign JwtUserPayload token
    const payload: JwtUserPayload = {
      uuid: userInsert.insert_users_one.uuid,
      role: "user",
      _id: userInsert.insert_users_one.uuid,
      "https://hasura.io/jwt/claims": {
        "x-hasura-allowed-roles": ["user"],
        "x-hasura-default-role": "user",
        "x-hasura-user-id": userInsert.insert_users_one.uuid,
      },
    };
    const token = jwt.sign(payload, process.env.SECRET!, {
      expiresIn: "24h",
    });
    return res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
});
/*
`/user/change-password`：修改密码。先验证请求中的验证码与`verificationToken`中的是否一致，再更新`hasura`中的密码
- 请求方法：`POST`
- 请求：`body`中有`{password: string, verificationCode: string, verificationToken: string}`，`token`是登陆时返回的，`password`是新密码，`verificationCode`是6位明文验证码，`verificationToken`是`/user/verify`返回的
- 响应：返回更改状态即可
*/
router.post("/change-password", authenticate(), async(req, res) => {
  const { password, verificationCode, verificationToken } = req.body;
  if (!password || !verificationCode || !verificationToken) {
    return res.status(422).send("422 Unprocessable Entity: Missing password or verificationCode or verificationToken");
  }
  if (!validatePassword(password)) {
    return res.status(401).send("401 Unauthorized: Password does not match");
  }
  try {
    const decoded = jwt.verify(verificationToken, process.env.SECRET!) as JwtVerifyPayload;
    const valid = await bcrypt.compare(verificationCode, decoded.code);
    if (!valid) {
      return res.status(401).send("401 Unauthorized: Verification code does not match");
    }
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    // graphql mutation, set password to password_hash
    await client.request(
      gql`
        mutation MyMutation($uuid: uuid!, $password: String!) {
          update_users_by_pk(pk_columns: {uuid: $uuid}, _set: {password: $password}) {
            uuid
          }
        }
      `,
      {
        uuid: req.auth.user.uuid,
        password: password_hash
      }
    );
    return res.status(200).end();
  } catch (err) {
    console.error(err);
    return res.send(500).send(err);
  }
});
/*
`/user/edit-profile`：更改通过验证的`email/phone`。先验证请求中的验证码与`verificationToken`中的是否一致，再更新`hasura`中的`email/phone`，如果`isTsinghua=True`那么校验邮箱为清华邮箱后更新`role`并重新返回`token`
- 请求方法：`POST`
- 请求：`body`中有`{verificationCode: string, verificationToken: string, isTsinghua: bool}`，`token`是登陆时返回的，`verificationCode`是6位明文验证码，`verificationToken`是`/user/verify`返回的
- 响应：返回更改状态（若`isTsinghua=True`返回`token`）
*/
router.post("/edit-profile", authenticate(), async(req, res) => {
  const { verificationCode, verificationToken, isTsinghua } = req.body;
  if (!verificationCode || !verificationToken) {
    return res.status(422).send("422 Unprocessable Entity: Missing verificationCode or verificationToken or isTsinghua");
  }
  try {
    const decoded = jwt.verify(verificationToken, process.env.SECRET!) as JwtVerifyPayload;
    const valid = await bcrypt.compare(verificationCode, decoded.code);
    if (!valid) {
      return res.status(401).send("401 Unauthorized: Verification code does not match");
    }
    if (isTsinghua) {
      // 验证邮箱为清华邮箱
      if (!validateEmail(decoded.email, true)) {
        return res.status(421).send("421 Authority Limited: Invalid Tsinghua email");
      }
      // 更新tsinghua_email和role
      await client.request(
        gql`
          mutation MyMutation($uuid: uuid!, $tsinghua_email: String!, $role: String!) {
            update_users_by_pk(pk_columns: {uuid: $uuid}, _set: {tsinghua_email: $tsinghua_email, role: $role}) {
              uuid
            }
          }
        `,
        {
          uuid: req.auth.user.uuid,
          tsinghua_email: decoded.email,
          role: "student"
        }
      );
      // 重新返回token
      const payload: JwtUserPayload = {
        uuid: req.auth.user.uuid,
        role: "student",
        _id: req.auth.user.id,
        "https://hasura.io/jwt/claims": {
          "x-hasura-allowed-roles": ["student"],
          "x-hasura-default-role": "student",
          "x-hasura-user-id": req.auth.user.uuid,
        },
      };
      const token = jwt.sign(payload, process.env.SECRET!, {
        expiresIn: "24h",
      });
      return res.status(200).json({ token });
    }
    else {
      if (decoded.email) {
        // 更新email
        await client.request(
          gql`
            mutation MyMutation($uuid: uuid!, $email: String!) {
              update_users_by_pk(pk_columns: {uuid: $uuid}, _set: {email: $email}) {
                uuid
              }
            }
          `,
          {
            uuid: req.auth.user.uuid,
            email: decoded.email
          }
        );
        return res.status(200).end();
      }
      else if (decoded.phone) {
        // 更新phone
        await client.request(
          gql`
            mutation MyMutation($uuid: uuid!, $phone: String!) {
              update_users_by_pk(pk_columns: {uuid: $uuid}, _set: {phone: $phone}) {
                uuid
              }
            }
          `,
          {
            uuid: req.auth.user.uuid,
            phone: decoded.phone
          }
        );
        return res.status(200).end();
      }
      return res.status(422).send("422 Unprocessable Entity: Missing email or phone");
    }
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  };
});
/*
`/user/delete`：删除用户。先验证请求中的验证码与`verificationToken`中的是否一致，再删除`hasura`中的数据列
- 请求方法：`POST`
- 请求：`body`中有`{verificationCode: string, verificationToken: string}`，`token`是登陆时返回的，`verificationCode`是6位明文验证码，`verificationToken`是`/user/verify`返回的
- 响应：返回更改状态即可
*/
router.post("/delete", authenticate(), async(req, res) => {
  const { verificationCode, verificationToken } = req.body;
  if (!verificationCode || !verificationToken) {
    return res.status(422).send("422 Unprocessable Entity: Missing verificationCode or verificationToken");
  }
  try {
    const decoded = jwt.verify(verificationToken, process.env.SECRET!) as JwtVerifyPayload;
    const valid = await bcrypt.compare(verificationCode, decoded.code);
    if (!valid) {
      return res.status(401).send("401 Unauthorized: Verification code does not match");
    }
    // 删除hasura中的数据列
    await client.request(
      gql`
        mutation MyMutation($uuid: uuid!) {
          delete_users_by_pk(uuid: $uuid) {
            uuid
          }
        }
      `,
      {
        uuid: req.auth.user.uuid
      }
    );
    return res.status(200).end();
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  };
});

export default router;
