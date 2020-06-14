const mongoose = require('mongoose');
const _ = require('lodash');
const { post } = require('../routes/trolls.router');
const { format } = require('morgan');

// const monk = require('monk');
// const db = monk(process.env.MONGO_URI || 'localhost/trollbox');
// const trollposts = db.get('trollposts');

const TrollPost = mongoose.model('TrollPost');

module.exports.getPosts = (req, res) => {
  TrollPost.find()
    .then(trollposts => {
      let formattedPosts = trollposts.map(post => {
        if (post.username === req.username) {
          return {
            id: post._id.toString(),
            created: post.created,
            username: post.username,
            userId: post.userId,
            content: post.content,
            alt: false
          }
        } else {
          return {
          id: post._id.toString(),
          created: post.created,
          username: post.username,
          userId: post.userId,
          content: post.content,
          alt: true
          }
        }
      })
      res.json(formattedPosts);
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