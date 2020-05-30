const express = require('express');
// library for talking to mongo db
const monk = require('monk');
const router = express.Router();
const db = monk(process.env.MONGO_URI || 'localhost/trollbox');

const rhymes = db.get('rhymes');

// Rhymes functions
function isValidRhyme(data) {
  if (data.rhymes.isArray()) {
    return data;
  }
  return false;
}

// Get rhymes
router.get('/', (req, res) => {
  rhymes
    .find()
    .then(rhymes => {
      res.json(rhymes);
    });
});

// Create Rhymes
router.post('/', (req, res) => {
  if (isValidRhyme(req.body)) {
    console.log(req.body.content)

    let rhymesArray = [];
    req.body.content.forEach(el => rhymesArray.push(el.toString().trim()))
    const rhyme = {
      rhymes: rhymesArray
    }
    rhymes
      .insert(rhyme)
      .then(createdRhyme => {
        res.json(createdRhyme);
      });
  } else {
    res.status(422);
    // console.log(req.body.content)
    res.json({
      message: "Hey! Rhymes must be an array of strings"
    });
  }
});

module.exports = router;