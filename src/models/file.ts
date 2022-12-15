import multer from "multer";
import fs from "fs";
const fileStorage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "/defaultUploadDir");
    },
    filename: function (req, file, callback) {
        callback(null, file.originalname);
    }
});
const uploadFunction = (req:any, res:any) => {
    const storage = multer.diskStorage({
        destination: function (req, file, callback) {
            var destination = req.body.dest;
            var stat;
            try {
                stat = fs.statSync(destination);
            } catch (err) {
                fs.mkdirSync(destination);
            }
            if (stat && !stat.isDirectory()) {
                throw new Error('文件目录： "' + destination + '已存在！"');
            }
            callback(null, destination);
        },
        filename: function (req, file, callback) {
            callback(null, file.originalname);
        }
    });
    const upload = multer({
        storage: storage
    }).single('file')

    return new Promise((resolve, reject) => {
        upload(req, res, (err) => {
            if (err) {
                return reject(err);
            }
            resolve("resolve!");
        })
    })
};
export default uploadFunction;
