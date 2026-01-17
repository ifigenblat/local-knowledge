# MongoDB Query Reference Guide

## Quick Comparison: SQL vs MongoDB

| SQL (Relational) | MongoDB (NoSQL) |
|-----------------|----------------|
| `SELECT * FROM cards` | `db.cards.find({})` |
| `SELECT * FROM cards WHERE type = 'concept'` | `db.cards.find({ type: 'concept' })` |
| `SELECT * FROM cards WHERE user_id = 123` | `db.cards.find({ user: ObjectId('123') })` |
| `INSERT INTO cards (title, content) VALUES (...)` | `db.cards.insertOne({ title: "...", content: "..." })` |
| `UPDATE cards SET title = "..." WHERE _id = 123` | `db.cards.updateOne({ _id: ObjectId('123') }, { $set: { title: "..." } })` |
| `DELETE FROM cards WHERE _id = 123` | `db.cards.deleteOne({ _id: ObjectId('123') })` |

---

## Method 1: MongoDB Shell (mongosh) - Command Line

### Connect to Database
```bash
mongosh mongodb://localhost:27017/local-knowledge
```

### Basic Commands
```javascript
// Show all databases
show dbs

// Switch to your database (already connected)
use local-knowledge

// Show all collections (like "tables" in SQL)
show collections

// Get all cards
db.cards.find()

// Get all cards (pretty printed)
db.cards.find().pretty()

// Get first card
db.cards.findOne()

// Count all cards
db.cards.countDocuments()
```

### Filtering (WHERE clauses)
```javascript
// Find cards by type
db.cards.find({ type: 'concept' })

// Find cards by category
db.cards.find({ category: 'Technology' })

// Find cards with specific tag
db.cards.find({ tags: 'javascript' })

// Find user by email
db.users.find({ email: 'test@example.com' })

// Find with multiple conditions (AND)
db.cards.find({ type: 'concept', category: 'Technology' })

// Find cards with specific field existing
db.cards.find({ provenance: { $exists: true } })
```

### Advanced Queries
```javascript
// Find cards containing text (text search)
db.cards.find({ $text: { $search: 'javascript' } })

// Find by user ID
db.cards.find({ user: ObjectId('696be653905d1755271198a') })

// Find with date range
db.cards.find({ 
  createdAt: { 
    $gte: ISODate('2025-01-01'),
    $lte: ISODate('2025-12-31')
  }
})

// Find cards with provenance information
db.cards.find({ 'provenance.source_file_id': { $exists: true } })

// Sort results
db.cards.find().sort({ createdAt: -1 })  // Newest first
db.cards.find().sort({ title: 1 })       // Alphabetical

// Limit results
db.cards.find().limit(10)

// Skip and limit (pagination)
db.cards.find().skip(0).limit(10)  // First page
db.cards.find().skip(10).limit(10) // Second page
```

### Update Data
```javascript
// Update one card
db.cards.updateOne(
  { _id: ObjectId('...') },
  { $set: { title: 'New Title' } }
)

// Update multiple cards
db.cards.updateMany(
  { type: 'concept' },
  { $set: { category: 'General' } }
)

// Add element to array
db.cards.updateOne(
  { _id: ObjectId('...') },
  { $push: { tags: 'new-tag' } }
)
```

### Delete Data
```javascript
// Delete one card
db.cards.deleteOne({ _id: ObjectId('...') })

// Delete multiple cards
db.cards.deleteMany({ type: 'concept' })
```

---

## Method 2: MongoDB Compass (GUI) - Visual Interface

1. **Download & Install**: https://www.mongodb.com/try/download/compass
2. **Connect**: `mongodb://localhost:27017/local-knowledge`
3. **Browse Collections**: Click on `cards`, `users`, `collections`
4. **Filter Data**: Use the filter bar at the top:
   - Type: `{ type: 'concept' }`
   - Or use the visual filter builder

### Compass Features
- Browse collections visually
- View documents in JSON format
- Edit documents inline
- Export data as JSON/CSV
- Visual query builder
- Index management

---

## Method 3: In Your Application Code (Mongoose)

Your application uses **Mongoose**, which provides a JavaScript API:

### Examples from Your Codebase

#### Get All Cards (with filters)
```javascript
// From server/routes/cards.js
const query = { user: req.user.id };
if (type) query.type = type;
if (category) query.category = category;

const cards = await Card.find(query)
  .sort({ createdAt: -1 })
  .limit(20);
```

#### Get One Card
```javascript
// From server/routes/cards.js
const card = await Card.findOne({ 
  _id: req.params.id, 
  user: req.user.id 
});
```

#### Create Card
```javascript
// From server/routes/cards.js
const card = new Card({
  title: 'My Card',
  content: 'Card content',
  type: 'concept',
  category: 'Technology',
  user: req.user.id,
  provenance: { ... }
});
await card.save();
```

#### Update Card
```javascript
// From server/routes/cards.js
const card = await Card.findOne({ _id: req.params.id });
card.title = 'Updated Title';
await card.save();
```

#### Delete Card
```javascript
// From server/routes/cards.js
await Card.findOneAndDelete({ 
  _id: req.params.id, 
  user: req.user.id 
});
```

---

## Common Query Patterns in Your App

### 1. Find Cards by User
```javascript
const cards = await Card.find({ user: userId });
```

### 2. Find Cards by Type
```javascript
const conceptCards = await Card.find({ type: 'concept' });
```

### 3. Search Cards
```javascript
const cards = await Card.find({
  $text: { $search: 'search term' }
});
```

### 4. Find Cards with Provenance
```javascript
const cards = await Card.find({
  'provenance.source_file_id': { $exists: true }
});
```

### 5. Find by Array (tags)
```javascript
const cards = await Card.find({
  tags: { $in: ['javascript', 'react'] }
});
```

### 6. Pagination
```javascript
const page = 1;
const limit = 20;
const cards = await Card.find({})
  .skip((page - 1) * limit)
  .limit(limit);
```

---

## Quick Reference: MongoDB Operators

- `$eq` - Equal to
- `$ne` - Not equal to
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - Value in array
- `$nin` - Value not in array
- `$exists` - Field exists
- `$regex` - Pattern matching
- `$and` - Logical AND
- `$or` - Logical OR
- `$not` - Logical NOT

---

## Try It Now!

### Connect and Explore:
```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/local-knowledge

# Then try these:
show collections
db.cards.find().pretty()
db.users.find().pretty()
db.cards.countDocuments()
db.cards.find({ type: 'concept' }).pretty()
```

---

## Need Help?

- **MongoDB Documentation**: https://docs.mongodb.com/
- **Mongoose Documentation**: https://mongoosejs.com/docs/
- **MongoDB Compass**: Download for visual GUI
