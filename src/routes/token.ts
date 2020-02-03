import jwt from "jsonwebtoken";
import { publicKey, privateKey } from "../configs/keypair";
import express from "express";

const router = express.Router();

router.get("/publicKey", (req, res) => {
  return res.status(200).send(privateKey);
});
/**
 * GET signature studentID
 * @param {number} stuId
 * @returns {string} jwt signed in RSA256 with id,name,and DIV(WIP)
 */
router.get("/signature/:stuId", (req, res) => {
  const signature = jwt.sign({ WIP: "tobedone" }, privateKey, {
    algorithm: "RS256",
    expiresIn: "1h"
  }); //WIP to be replaced by USER
  return res.status(200).send(signature);
});

/**
 * GET signature studentID
 * @param {signature} signature to be verified
 * @returns {bool} signature is valid or not
 */
router.get("/verification/:signature", (req, res) => {
  try {
    const decode = jwt.verify(req.params.signature, publicKey);
    if (decode) return res.status(200).send(true);
    else return res.status(200).send(false);
  } catch {
    return res.status(200).send(false);
  }
});
