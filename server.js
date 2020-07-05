require('./config/config');
require('./models/db');
require('./config/passportConfig');

const express = require('express'); 
const cors = require('cors');
const passport = require('passport');
const path = require('path');
const { TaskTimer } = require('tasktimer');

const mongoose = require('mongoose');
const Blacklist = mongoose.model('Blacklist');
const User = mongoose.model('User');

// Routes
const rtsIndex = require('./routes/index.router');
const trollsRouter = require('./routes/trolls.router');
const rhymesRouter = require('./routes/rhymes.router');
const userRouter = require('./routes/upload.router');
const authRouter = require('./routes/auth.router').router;

// Setup Express.js
const app = express();

// Create a timer that runs tasks ever 5 minutes on the server
const timer = new TaskTimer(1000 * 60 * 5);
// Create scheduled task to clear out any blacklisted tokens that have already expired from the database; Reduces load when checking each api request.
timer.add(task => {
  console.log('Checking for redundant tokens...');
  Blacklist.deleteMany({ created: { $lte: Date.now() } }, (err, result) => {
    if (!err) {
      if (result.n > 0) {
        console.log('Tokens removed from blacklist.');
      } else {
        console.log('No tokens needed to be removed from blacklist.')
      }
    } else {
      console.log('There was an error removing expired blacklist tokens:')
      console.log(err)
    }
  });
}).start();

// Add a task to the schedule that sets users that are currently marked as active but were last active 10 mins ago
timer.add(task => {
  console.log('Checking for inactive users...');
  User.updateMany( { active: true, lastActive: { $lte: Date.now() - 600000 } }, {"$set":{active: false}}, (err, result) => {
    if (!err) {
      if (result.nModified > 0) {
        console.log('Active users updated.');
      } else {
        console.log('No users needed to be set to inactive')
      }
    } else {
      console.log('There was an error updating inactive users:')
      console.log(err)
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

app.get('/', (req, res) => {
  res.json({
    message: 'Hello there'
  })
});

// API Route
app.use('/api', rtsIndex);
app.use('/trolls', trollsRouter);
app.use('/rhymes', rhymesRouter);
app.use('/upload', userRouter);
// app.use('/auth', authRouter);


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

app.listen(process.env.PORT, () => {
  console.log(`Listening on http://localhost:${process.env.PORT}`);
});