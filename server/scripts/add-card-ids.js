const mongoose = require('mongoose');
const Card = require('../models/Card');
require('dotenv').config({ path: '.env' });

async function addCardIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const cardsWithoutId = await Card.find({ cardId: { $exists: false } });
    console.log(`Found ${cardsWithoutId.length} cards without cardId`);

    for (const card of cardsWithoutId) {
      const cardId = await Card.generateCardId();
      card.cardId = cardId;
      await card.save();
      console.log(`Added cardId ${cardId} to card: ${card.title}`);
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

addCardIds();
