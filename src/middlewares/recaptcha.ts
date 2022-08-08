import { NextFunction, Request, Response } from "express";
import { URLSearchParams } from "url";
import fetch from "node-fetch";

const recaptcha = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.body.recaptcha) {
    return res
      .status(422)
      .send("422 Unprocessable Entity: Missing reCAPTCHA response");
  }

  try {
    const params = new URLSearchParams();
    params.append("secret", process.env.RECAPTCHA_KEY!);
    params.append("response", req.body.recaptcha);

    const response = await fetch(
      "https://www.recaptcha.net/recaptcha/api/siteverify",
      { method: "POST", body: params }
    );
    const result: any = await response.json();

    if (result.success) {
      next();
    } else {
      res.status(400).end("Invalid reCAPTCHA");
    }
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
};

export default recaptcha;
