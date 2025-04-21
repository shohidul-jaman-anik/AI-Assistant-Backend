import aws from "aws-sdk";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import config from "../../../../config/index.js";


// Needed to resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const audioUploader = (options) => {
  const {
    folder,
    acl,
    supportedExtensions = /\.(mp3|mpeg|wav|m4a|ogg)$/i,
    maxFileSize = 10 * 1024 * 1024,
  } = options;

  const spacesEndpoint = new aws.Endpoint("nyc3.digitaloceanspaces.com");

  const s3 = new aws.S3({
    accessKeyId: config.cloud_storage_access_key,
    secretAccessKey: config.cloud_storage_secret_key,
    endpoint: spacesEndpoint,
  });

  const storage = multerS3({
    s3,
    bucket: config.cloud_storage_bucket,
    acl,
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const key = `${folder}/${uniqueSuffix}-${file.originalname}`;
      cb(null, key);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
  });

  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      const extension = path.extname(file.originalname);
      if (supportedExtensions.test(extension)) {
        cb(null, true);
      } else {
        cb(new Error(`Only audio files are allowed: ${supportedExtensions}`));
      }
    },
    limits: { fileSize: maxFileSize },
  });
};

export default audioUploader;
