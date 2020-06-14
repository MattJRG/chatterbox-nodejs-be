require('./config/config');
require('./models/db');
require('./config/passportConfig');

const express = require('express'); 
const cors = require('cors');
const passport = require('passport');
// const rateLimit = require('express-rate-limit');
const path = require('path');
const { TaskTimer } = require('tasktimer');

const mongoose = require('mongoose');
const Blacklist = mongoose.model('Blacklist');

// Routes
const rtsIndex = require('./routes/index.router');
const trollsRouter = require('./routes/trolls.router');
const rhymesRouter = require('./routes/rhymes.router');
const userRouter = require('./routes/upload.router');
const authRouter = require('./routes/auth.router').router;

// Setup Express.js
const app = express();

// Create scheduled task to clear out any blacklisted tokens that have already expired from the database; Reduces load when checking each api request.
const timer = new TaskTimer(1000 * 60 * 5);
timer.add(task => {
  console.log('Checking for redundant tokens...');
  Blacklist.find()
  .then(blacklist => {
    if (blacklist.length > 0) {
      let idsToBeDeleted = [];
      blacklist.forEach(item => {
        if (item.created < Date.now()) {
          idsToBeDeleted.push(item._id);
        }
      })
      if (idsToBeDeleted.length > 0) {
        console.log(`Tokens removed from blacklist: ${idsToBeDeleted.length}.`)
        Blacklist.deleteMany({ _id: idsToBeDeleted})
        .then()
      }
    }
  })
}).start();

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
app.use(passport.initialize());

// Make 'public" folder publically available
app.use('/public', express.static('public'));

// API Route
app.use('/api', rtsIndex);
app.use('/trolls', trollsRouter);
app.use('/rhymes', rhymesRouter);
app.use('/upload', userRouter);
app.use('/auth', authRouter);


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

app.listen(process.env.PORT, () => {
  console.log(`Listening on http://localhost:${process.env.PORT}`);
});