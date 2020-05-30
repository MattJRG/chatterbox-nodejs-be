const express = require('express'); 
const cors = require('cors');
// const rateLimit = require('express-rate-limit');
var path = require('path');

// Routes
const trollsRouter = require('./routes/trolls');
const rhymesRouter = require('./routes/rhymes');
const userRouter = require('./routes/user');

// Setup Express.js
const app = express();
const port = 5000;

// specify the folder
app.use(express.static(path.join(__dirname, 'uploads')));
// headers and content type
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// body parser middleware any income requests that has a content type of application json will be added to the body so we can access e.g. req.body
app.use(express.json());
app.use(express.urlencoded({
  extended: false
}));
app.use(cors());

// Make 'public" folder publically available
app.use('/public', express.static('public'));

// API Route
app.get('/', (req, res) => {
  res.json({
    message: 'Hello there'
  })
});

app.use('/trolls', trollsRouter);
app.use('/rhymes', rhymesRouter);
app.use('/upload', userRouter);

// Error favicon.ico
app.get('favicon.ico', (req, res) => res.status(204));

// Error
app.use((req, res, next) => {
  // Error goes via `next()` method
  setImmediate(() => {
    next(new Error('Something went wrong'));
  });
});

app.use(function (err, req, res, next) {
  console.error(err.message);
  if (!err.statusCode) err.statusCode = 500;
  res.status(err.statusCode).send(err.message);
});

// app.use(rateLimit({
//   windowMs: 1000, // 1 per second
//   max: 1
// }));

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});