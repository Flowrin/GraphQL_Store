const express = require('express');

const path = require('path');
const fs = require('fs');

const bodyParser = require('body-parser');

const multer = require('multer');

const { graphqlHTTP } = require('express-graphql');

const graphqlSchema = require('./graphQL/schema');

const graphqlResolver = require('./graphQL/resolver');

const auth = require('./middleware/auth');

const {clearImage} = require('./util/file')

const mongoose = require('mongoose');
const MONGODB_URI =
  'mongodb+srv://flowrin13:wp8g6Ckw@cluster0.q8jry.mongodb.net/messages';

const app = express();
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './images');
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().substring(0, 10) + '-' + file.originalname
    );
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

//app.use(bodyParser.urlencoded()); // x-www-form urlcencoded >form>

app.use(bodyParser.json({ extended: true })); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images'))); // application/json

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    // grapql denies any other type of method except GET and POST , options is always send therfor that need handling
    return res.sendStatus(200);
  }
  next();
});
app.use(auth);



app.use(
  '/graphql',
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true, //this,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || ' an error occured';
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data };
    },
  })
);

app.put('/post-image', (req, res, next) => {
  if (!req.file) {
    return res.status(200).json({ message: 'file not provided' });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }

  return res
    .status(201)
    .json({ message: 'File stored', filePath: req.file.path });
});
app.use((err, req, res, next) => {
  console.log(err);
  const status = err.statusCode || 500;
  const message = err.message;
  const data = err.data;
  res.status(status).json({ message: message, data: data });
});
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then((result) => {
    app.listen(8080);
  })
  .catch((err) => {
    console.log(err);
  });

