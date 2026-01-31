# MongoDB to PostgreSQL Migration Analysis

## Executive Summary

This document provides a comprehensive analysis of migrating LocalKnowledge from MongoDB (with Mongoose) to PostgreSQL. The migration will require significant refactoring across models, routes, middleware, and scripts, but will provide better data structure, consistency, and relational capabilities.

**Estimated Effort**: 40-60 hours of development work
**Recommended ORM**: Sequelize (most mature, best PostgreSQL support)
**Alternative ORM**: TypeORM (TypeScript-first, more modern)

---

## Current MongoDB/Mongoose Usage

### Models (4 Total)
1. **User** - User accounts, authentication, preferences
2. **Card** - Learning cards with complex nested structures
3. **Collection** - Card groupings
4. **Role** - RBAC with nested permissions object

### Key Mongoose Features Used
- Schema definitions with validation
- Indexes (single and compound)
- Virtual fields
- Pre-save hooks
- Static methods
- Instance methods
- Timestamps (createdAt, updatedAt)
- References (ObjectId with ref)
- Populate (JOIN equivalent)
- Text search indexes
- Sparse indexes
- Unique constraints

### Query Patterns
- `find()`, `findOne()`, `findById()`
- `countDocuments()`
- `create()`, `save()`, `updateOne()`, `updateMany()`
- `deleteOne()`, `deleteMany()`
- `populate()` for joins
- `$text` search
- `$or`, `$ne` operators
- Pagination with `skip()` and `limit()`
- Sorting with `sort()`

---

## PostgreSQL Migration Strategy

### Recommended Approach: Sequelize ORM

**Why Sequelize?**
- Mature and stable
- Excellent PostgreSQL support
- Active community
- Good documentation
- Supports migrations
- Built-in validation
- Association handling (JOINs)
- Transaction support

### Alternative: TypeORM
- TypeScript-first
- More modern syntax
- Better decorator support
- More complex setup

---

## Schema Migration Plan

### 1. Users Table

**MongoDB Schema:**
```javascript
{
  name: String (required, trim),
  email: String (required, unique, lowercase, index),
  password: String (required, minlength: 6),
  resetPasswordToken: String (nullable),
  resetPasswordExpires: Date (nullable),
  role: ObjectId (ref: 'Role', nullable),
  mustChangePassword: Boolean (default: false),
  preferences: {
    theme: String (enum: ['light', 'dark', 'auto']),
    cardView: String (enum: ['grid', 'list']),
    notifications: Boolean
  },
  timestamps: true
}
```

**PostgreSQL Schema (Sequelize):**
```javascript
{
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true, isLowercase: true },
    index: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { len: [6, Infinity] }
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  roleId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'roles', key: 'id' }
  },
  mustChangePassword: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  preferencesTheme: {
    type: DataTypes.ENUM('light', 'dark', 'auto'),
    defaultValue: 'auto',
    field: 'preferences_theme'
  },
  preferencesCardView: {
    type: DataTypes.ENUM('grid', 'list'),
    defaultValue: 'grid',
    field: 'preferences_card_view'
  },
  preferencesNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'preferences_notifications'
  },
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE
}
```

**Changes:**
- `_id` → `id` (UUID instead of ObjectId)
- `role` → `roleId` (foreign key)
- Nested `preferences` object flattened to separate columns
- Timestamps handled automatically

---

### 2. Roles Table

**MongoDB Schema:**
```javascript
{
  name: String (required, unique, lowercase, index),
  displayName: String (required),
  description: String,
  permissions: {
    cards: { view, create, edit, delete, viewAll, editAll, deleteAll },
    collections: { view, create, edit, delete, viewAll, editAll, deleteAll },
    users: { view, create, edit, delete, assignRoles },
    roles: { view, create, edit, delete },
    system: { viewSettings, editSettings, viewLogs },
    upload: { upload, uploadMultiple, viewAll }
  },
  isSystem: Boolean,
  isImmutable: Boolean,
  isActive: Boolean (index),
  createdBy: ObjectId (ref: 'User'),
  timestamps: true
}
```

**PostgreSQL Schema (Sequelize):**
```javascript
{
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isLowercase: true },
    index: true
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  permissionsCardsView: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'permissions_cards_view'
  },
  permissionsCardsCreate: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'permissions_cards_create'
  },
  // ... (all permission fields flattened)
  permissionsUploadViewAll: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'permissions_upload_view_all'
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isImmutable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    index: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    field: 'created_by_id'
  },
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE
}
```

**Alternative: JSONB Column for Permissions**
```javascript
permissions: {
  type: DataTypes.JSONB,
  allowNull: false,
  defaultValue: {}
}
```

**Recommendation**: Use JSONB for permissions to maintain flexibility and avoid 20+ boolean columns.

---

### 3. Cards Table

**MongoDB Schema:**
- Complex nested structure with:
  - `cardId` (unique, sparse index)
  - `metadata` object (nested)
  - `provenance` object (nested)
  - `attachments` array
  - `tags` array
  - `relatedCards` array (ObjectId refs)

**PostgreSQL Schema (Sequelize):**
```javascript
{
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  cardId: {
    type: DataTypes.STRING(6),
    allowNull: true,
    unique: true,
    index: true,
    validate: { isUppercase: true }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  contentHash: {
    type: DataTypes.STRING,
    allowNull: true,
    index: true
  },
  type: {
    type: DataTypes.ENUM('concept', 'action', 'quote', 'checklist', 'mindmap'),
    defaultValue: 'concept'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    index: true
  },
  metadataDifficulty: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    validate: { min: 1, max: 5 },
    field: 'metadata_difficulty'
  },
  metadataEstimatedTime: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    field: 'metadata_estimated_time'
  },
  metadataLastReviewed: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'metadata_last_reviewed'
  },
  metadataReviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'metadata_review_count'
  },
  metadataRating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 1, max: 5 },
    field: 'metadata_rating'
  },
  provenance: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE
}
```

**Separate Tables Needed:**
1. **card_related_cards** (many-to-many relationship)
   ```sql
   CREATE TABLE card_related_cards (
     card_id UUID REFERENCES cards(id),
     related_card_id UUID REFERENCES cards(id),
     PRIMARY KEY (card_id, related_card_id)
   );
   ```

2. **Full-text search**: Use PostgreSQL's `tsvector` and `tsquery` for text search instead of MongoDB's `$text`.

---

### 4. Collections Table

**MongoDB Schema:**
```javascript
{
  name: String (required),
  description: String,
  cards: [ObjectId] (ref: 'Card'),
  isPublic: Boolean,
  user: ObjectId (ref: 'User'),
  timestamps: true
}
```

**PostgreSQL Schema (Sequelize):**
```javascript
{
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    index: true
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdAt: DataTypes.DATE,
  updatedAt: DataTypes.DATE
}
```

**Separate Table Needed:**
**collection_cards** (many-to-many relationship)
```sql
CREATE TABLE collection_cards (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  card_id UUID REFERENCES cards(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (collection_id, card_id)
);
```

---

## Code Changes Required

### 1. Package Dependencies

**Remove:**
```json
"mongoose": "^8.0.3"
```

**Add:**
```json
"sequelize": "^6.35.0",
"pg": "^8.11.3",
"pg-hstore": "^2.3.0"
```

**For migrations:**
```json
"sequelize-cli": "^6.6.2"
```

---

### 2. Database Connection

**Current (MongoDB):**
```javascript
// server/index.js
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
```

**New (PostgreSQL with Sequelize):**
```javascript
// server/config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DATABASE_URL || process.env.POSTGRES_URI,
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
```

---

### 3. Model Definitions

**Current (Mongoose):**
```javascript
// server/models/User.js
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({ ... });
module.exports = mongoose.model('User', userSchema);
```

**New (Sequelize):**
```javascript
// server/models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  // ... rest of fields
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true
});

// Associations
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(User, { foreignKey: 'roleId' });

module.exports = User;
```

---

### 4. Query Translation

#### Basic Queries

**Mongoose:**
```javascript
const user = await User.findOne({ email });
const users = await User.find({ role: roleId });
const count = await User.countDocuments({ isActive: true });
```

**Sequelize:**
```javascript
const user = await User.findOne({ where: { email } });
const users = await User.findAll({ where: { roleId } });
const count = await User.count({ where: { isActive: true } });
```

#### Populate (JOINs)

**Mongoose:**
```javascript
const user = await User.findById(id).populate('role');
const collection = await Collection.findById(id).populate('cards');
```

**Sequelize:**
```javascript
const user = await User.findByPk(id, {
  include: [{ model: Role, as: 'role' }]
});

const collection = await Collection.findByPk(id, {
  include: [{ model: Card, as: 'cards', through: 'collection_cards' }]
});
```

#### Text Search

**Mongoose:**
```javascript
const cards = await Card.find({ $text: { $search: query } });
```

**Sequelize:**
```javascript
const { Op } = require('sequelize');
const cards = await Card.findAll({
  where: {
    [Op.or]: [
      { title: { [Op.iLike]: `%${query}%` } },
      { content: { [Op.iLike]: `%${query}%` } }
    ]
  }
});

// Or use PostgreSQL full-text search:
const cards = await sequelize.query(
  `SELECT * FROM cards 
   WHERE to_tsvector('english', title || ' ' || content) @@ to_tsquery('english', :query)`,
  {
    replacements: { query: query.split(' ').join(' & ') },
    model: Card
  }
);
```

#### Pagination

**Mongoose:**
```javascript
const cards = await Card.find(query)
  .sort({ createdAt: -1 })
  .limit(limit)
  .skip((page - 1) * limit);
```

**Sequelize:**
```javascript
const cards = await Card.findAll({
  where: query,
  order: [['createdAt', 'DESC']],
  limit: limit,
  offset: (page - 1) * limit
});
```

#### Updates

**Mongoose:**
```javascript
await user.save();
await User.updateOne({ _id: id }, { name: 'New Name' });
```

**Sequelize:**
```javascript
await user.save();
await User.update({ name: 'New Name' }, { where: { id } });
```

#### Static Methods

**Mongoose:**
```javascript
cardSchema.statics.generateCardId = async function() { ... };
const cardId = await Card.generateCardId();
```

**Sequelize:**
```javascript
// In model definition
Card.generateCardId = async function() { ... };
const cardId = await Card.generateCardId();
```

#### Instance Methods

**Mongoose:**
```javascript
cardSchema.methods.generateContentHash = function() { ... };
const hash = card.generateContentHash();
```

**Sequelize:**
```javascript
// In model definition
Card.prototype.generateContentHash = function() {
  // ...
};
const hash = card.generateContentHash();
```

#### Pre-save Hooks

**Mongoose:**
```javascript
cardSchema.pre('save', async function(next) {
  if (!this.cardId) {
    this.cardId = await this.constructor.generateCardId();
  }
  next();
});
```

**Sequelize:**
```javascript
Card.beforeCreate(async (card) => {
  if (!card.cardId) {
    card.cardId = await Card.generateCardId();
  }
});

Card.beforeUpdate(async (card) => {
  // Update hooks
});
```

---

### 5. Route Changes

**All route files need updates:**
- `server/routes/auth.js` - Replace Mongoose queries
- `server/routes/cards.js` - Replace queries, handle UUIDs
- `server/routes/collections.js` - Replace queries, handle many-to-many
- `server/routes/users.js` - Replace queries
- `server/routes/roles.js` - Replace queries
- `server/routes/upload.js` - Update card creation logic

**Key Changes:**
- `req.user.id` → `req.user.id` (still works, but now UUID)
- `user._id` → `user.id`
- `mongoose.Types.ObjectId.isValid()` → UUID validation
- ObjectId string length checks → UUID format checks

---

### 6. Middleware Changes

**server/middleware/auth.js:**
- JWT payload still uses `id` (now UUID)
- User lookup: `User.findByPk(id)` instead of `User.findById(id)`

**server/middleware/authorize.js:**
- Replace `populate()` with `include`
- Update permission checking logic

---

### 7. Script Changes

**All scripts in `server/scripts/` need updates:**
- `init-roles.js` - Use Sequelize models
- `create-admin-user.js` - Use Sequelize models
- `assign-admin-role.js` - Use Sequelize models
- `add-card-ids.js` - Use Sequelize models

**Connection:**
```javascript
// Old
await mongoose.connect(process.env.MONGODB_URI);

// New
const sequelize = require('../config/database');
await sequelize.authenticate();
```

---

### 8. Environment Variables

**Remove:**
```
MONGODB_URI=mongodb://...
```

**Add:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/localknowledge
# OR
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=localknowledge
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
```

---

## Migration Steps

### Phase 1: Setup (2-4 hours)
1. Install PostgreSQL locally or use Docker
2. Install Sequelize and pg packages
3. Create database connection module
4. Set up Sequelize CLI for migrations
5. Update environment variables

### Phase 2: Model Migration (8-12 hours)
1. Create Sequelize models for all 4 tables
2. Define associations (belongsTo, hasMany, belongsToMany)
3. Create migration files for schema
4. Set up indexes
5. Handle JSONB columns for nested data
6. Create junction tables for many-to-many relationships

### Phase 3: Route Migration (12-16 hours)
1. Update auth routes
2. Update card routes (most complex)
3. Update collection routes
4. Update user routes
5. Update role routes
6. Update upload routes

### Phase 4: Middleware & Utilities (4-6 hours)
1. Update auth middleware
2. Update authorize middleware
3. Update content processor (if needed)
4. Update AI processor (if needed)

### Phase 5: Scripts & Setup (4-6 hours)
1. Update all initialization scripts
2. Update setup.sh
3. Update check-server.sh
4. Update documentation

### Phase 6: Testing & Validation (8-12 hours)
1. Test all API endpoints
2. Test authentication flow
3. Test file upload and card creation
4. Test role and user management
5. Test collections
6. Test search functionality
7. Test pagination
8. Integration testing

### Phase 7: Documentation (2-4 hours)
1. Update README.md
2. Update setup documentation
3. Update API documentation
4. Update architecture diagrams

---

## Challenges & Considerations

### 1. UUID vs ObjectId
- **Challenge**: All ID references change from ObjectId to UUID
- **Solution**: Use UUID v4 for all primary keys
- **Impact**: Frontend may need minor updates if it validates ID format

### 2. Nested Objects
- **Challenge**: MongoDB allows nested objects easily
- **Solution**: Use JSONB columns for flexible nested data (permissions, provenance, metadata)
- **Alternative**: Flatten to separate columns (more structured, less flexible)

### 3. Arrays
- **Challenge**: MongoDB arrays vs PostgreSQL arrays
- **Solution**: Use PostgreSQL ARRAY type or JSONB
- **Example**: `tags: DataTypes.ARRAY(DataTypes.STRING)`

### 4. Text Search
- **Challenge**: MongoDB `$text` search vs PostgreSQL full-text search
- **Solution**: Use PostgreSQL `tsvector` and `tsquery` or `ILIKE` for simple searches
- **Benefit**: More powerful full-text search capabilities

### 5. Many-to-Many Relationships
- **Challenge**: MongoDB arrays vs proper junction tables
- **Solution**: Create junction tables (collection_cards, card_related_cards)
- **Benefit**: Better referential integrity and query performance

### 6. Sparse Indexes
- **Challenge**: MongoDB sparse indexes (allow nulls)
- **Solution**: PostgreSQL partial indexes
- **Example**: `CREATE INDEX idx_card_id ON cards(card_id) WHERE card_id IS NOT NULL;`

### 7. Virtual Fields
- **Challenge**: Mongoose virtuals don't exist in Sequelize
- **Solution**: Use getters or computed properties
- **Example**: `get formattedContent() { return this.content.replace(/\n/g, '<br>'); }`

### 8. Pre-save Hooks
- **Challenge**: Mongoose pre-save hooks
- **Solution**: Sequelize hooks (beforeCreate, beforeUpdate, etc.)

---

## Benefits of Migration

### 1. Data Integrity
- Foreign key constraints
- Referential integrity
- ACID transactions
- Better data validation

### 2. Query Performance
- Better query optimization
- Index optimization
- JOIN performance
- Full-text search capabilities

### 3. Structure & Consistency
- Enforced schema
- Type safety
- Better relationships
- Easier to understand data model

### 4. Scalability
- Better for complex queries
- Better for reporting
- Better for analytics
- Horizontal scaling options

### 5. Tooling
- Better admin tools (pgAdmin, DBeaver)
- Better migration tools
- Better backup/restore
- Better monitoring

---

## Risks & Mitigation

### 1. Breaking Changes
- **Risk**: API changes might break frontend
- **Mitigation**: Maintain API contract, only change internal implementation

### 2. Performance Issues
- **Risk**: Initial queries might be slower
- **Mitigation**: Proper indexing, query optimization, connection pooling

### 3. Learning Curve
- **Risk**: Team needs to learn Sequelize
- **Mitigation**: Good documentation, gradual migration, training

### 4. Migration Complexity
- **Risk**: Complex nested structures
- **Mitigation**: Use JSONB for complex data, gradual migration

---

## Recommended Migration Path

### Option 1: Big Bang Migration (Recommended for fresh start)
1. Set up PostgreSQL
2. Create all Sequelize models
3. Update all routes at once
4. Test thoroughly
5. Deploy

**Pros**: Clean break, no dual support needed
**Cons**: Large change, higher risk

### Option 2: Gradual Migration
1. Set up dual database support
2. Migrate one model at a time
3. Update routes incrementally
4. Switch over gradually

**Pros**: Lower risk, can roll back
**Cons**: More complex, dual maintenance

**Recommendation**: Since you mentioned no data migration needed, go with Option 1 (Big Bang).

---

## File Structure After Migration

```
server/
├── config/
│   └── database.js          # Sequelize connection
├── models/
│   ├── index.js            # Sequelize model loader
│   ├── User.js             # Sequelize User model
│   ├── Role.js             # Sequelize Role model
│   ├── Card.js             # Sequelize Card model
│   └── Collection.js        # Sequelize Collection model
├── migrations/
│   ├── 20240101000001-create-users.js
│   ├── 20240101000002-create-roles.js
│   ├── 20240101000003-create-cards.js
│   ├── 20240101000004-create-collections.js
│   ├── 20240101000005-create-collection-cards.js
│   └── 20240101000006-create-card-related-cards.js
├── seeders/
│   ├── 20240101000001-init-roles.js
│   └── 20240101000002-create-admin-user.js
└── routes/
    └── ... (updated routes)
```

---

## Estimated Timeline

- **Setup & Planning**: 1 day
- **Model Migration**: 2-3 days
- **Route Migration**: 3-4 days
- **Testing & Bug Fixes**: 2-3 days
- **Documentation**: 1 day

**Total**: 9-12 days (assuming 8-hour workdays)

---

## Next Steps

1. **Decision**: Confirm PostgreSQL migration
2. **Setup**: Install PostgreSQL and Sequelize
3. **Prototype**: Create one model (User) and test
4. **Plan**: Create detailed migration checklist
5. **Execute**: Follow migration phases
6. **Test**: Comprehensive testing
7. **Deploy**: Update production environment

---

## Conclusion

Migrating from MongoDB to PostgreSQL is a significant undertaking but provides substantial benefits in terms of data structure, consistency, and relational capabilities. The migration is feasible and well-supported by Sequelize ORM. The estimated effort is 40-60 hours, with the biggest challenges being:

1. Query translation (especially populate/joins)
2. Handling nested structures (JSONB vs flattened)
3. Text search implementation
4. Many-to-many relationships

With proper planning and execution, the migration can be completed successfully and will provide a more robust foundation for future growth.
