const mongoose = require('mongoose');
const _ = require('lodash');
const { post } = require('../routes/trolls.router');
const { format } = require('morgan');

const TrollPost = mongoose.model('TrollPost');

module.exports.getPosts = (req, res) => {
  let queryParams = req.query;
  TrollPost.countDocuments({}, (err, count) => {
    postCount = count;
  }).then(count => {
    // If this is the initial query return the latest 10 records
    if (queryParams.query === 'initial') {
      TrollPost.find({}, null, {limit: 10, sort: {'created': -1}})
      .then(trollposts => {
        // Reverse array as it is in the wrong order
        res.json(
          {
            posts: createFormattedPost(trollposts, req).reverse(),
            totalPosts: count
          });
      });
    // Else if we want the previous records
    } else if (queryParams.query === 'previous') {
      let record_id = queryParams.earliestId;
      TrollPost.find({'_id': {$lt: record_id } }).sort({'created': -1}).limit(10)
      .then(trollposts => {
        // Reverse array as it is in the wrong order
        res.json(
          {
            posts: createFormattedPost(trollposts, req).reverse(),
            totalPosts: count
          });
      })
    } else if (queryParams.query === 'latest') {
      let record_id = queryParams.latestId;
      TrollPost.find({'_id': {$gt: record_id } })
      .then(trollposts => {
        // Reverse array as it is in the wrong order
        res.json(
          {
            posts: createFormattedPost(trollposts, req),
            totalPosts: count
          });
      })
    } else {
      TrollPost.find()
      .then(trollposts => {
        res.json(
          {
            posts: createFormattedPost(trollposts, req),
            totalPosts: count
          });
      });
    }
  });
};

module.exports.createPost = (req, res) => {
  if (isValidPost(req.body)) {
    let post = new TrollPost();
    post.username = req.username,
    post.userId = req._id,
    post.content = req.body.content.toString(),
    post.created = new Date()
    post.save()
      .then(newPost => {
        res.json(newPost);
      })
      .catch(err => {
        console.log('Error adding post to DB');
        console.log(err);
      });
  } else {
    res.status(422);
    res.json({
      message: 'Hey! We don\'t accept blank content!'
    });
  }
};

// Helper functions
function isValidPost(post) {
  return post.content && post.content.toString().trim() !== '';
}

// Create the formatted response of posts
function createFormattedPost(posts, req) {
  return posts.map(post => {
    if (post.username === req.username) return createPost(post, false);
    else return createPost(post, true);
  });
}

// Map the database post values to response post keys
function createPost(post, alt) {
  return {
  id: post._id.toString(),
  created: post.created,
  username: post.username,
  userId: post.userId,
  content: post.content,
  alt: alt
  }
}

// const rateLimit = require('express-rate-limit');

// app.use(rateLimit({
//   windowMs: 1000, // 1 per second
//   max: 1
// }));