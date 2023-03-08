import express from "express";
import authenticate from "../middlewares/authenticate";
import getSTS from "../helpers/sts";

const router = express.Router();

router.get("/", authenticate(["counselor", "root"]), async (req, res) => {
  try{
    const action = [
      "name/cos:PutObject",
      "name/cos:InitiateMultipartUpload",
      "name/cos:ListMultipartUploads",
      "name/cos:ListParts",
      "name/cos:UploadPart",
      "name/cos:CompleteMultipartUpload",
      "name/cos:AbortMultipartUpload",
      "name/cos:GetObject",
      "name/cos:DeleteObject",
    ];
    const sts = await getSTS(action, "*");
    return res.status(200).send(sts);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

export default router;
