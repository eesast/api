import express from "express";
import fs from "fs";
import path from "path";
const router = express.Router();

const mkdirsSync = (dirname: string) => {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkdirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}

router.post('/upload', async (req, res) => {
  try{
    const file: string = req.body.file;
    const dest: string = req.body.dest;
    mkdirsSync(path.dirname(dest));
    fs.writeFile(dest, file, 'utf8', function(err) {
      if(err) throw err;
      else return res.status(200).send("ok!");
    });
  }
  catch (err) {
    return res.status(500).send(err);
  }
});

export default router;
