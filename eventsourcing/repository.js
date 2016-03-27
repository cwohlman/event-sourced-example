EntityRepo = class {
  static create() {
    // XXX namespace
    return new EntityRepo();
  }
  types() {
    this._types = this._types || [];
    return this._types;
  }
  entityCollections() {
    this._entityCollections = this._entityCollections || [];
    return this._entityCollections;
  }
  eventCollections() {
    this._eventCollections = this._eventCollections || [];
    return this._eventCollections;
  }
  register(type) {
    check(type, Match.OneOf(Entity, EntityEvent, EntityCommand));

    this.checkName(type.typeName);

    if (type instanceof Entity) {
      this.createCollections(type);
    }

    this.types()[typeName] = type;
  }
  checkName(name) {
    check(name, String);

    this._names = this._names || [];
    if (_.contains(this._names, name)) {
      throw new Error(`Tried to add two entities with the same name: "${name}".`);
    }

    this._names.push(name);
  }
  createCollections(type) {
    const name = type.typeName();
    check(name, String);
    if (this.unbacked) {
      this.entityCollections()[name] = new Mongo.Collection(null);
      this.eventCollections()[name] = new Mongo.Collection(null);
    } else {
      this.entityCollections()[name] = new Mongo.Collection(`${name}/entities`);
      this.eventCollections()[name] = new Mongo.Collection(`${name}/events`);
    }
  }
  _get(typeName, entityId) {
    check(typeName, String);
    check(entityId, String);

    const collection = this.entityCollections()[typeName];
    return collection.findOne({
      _id: entityId,
    });
  }
  _commit(typeName, entity) {
    check(typeName, String);
    check(entity, Entity);

    if (entity.isInvalid) {
      throw new Error("The entity has already been saved to the repo.");
    }

    const eventsCollection = this.eventCollections()[typeName];
    const entitiesCollection = this.entityCollections()[typeName];

    const entityId = entity._id || Random.id();
    let entityVersion = entity._version || 0;

    // Save events
    const events = _.map(entity.events, (event) => {
      const doc = event.raw();

      doc._entity = entityId;
      doc._version = ++entityVersion;

      return doc;
    });

    _.each(events, (doc) => eventsCollection.insert(doc));

    // Save the doc
    const entityDoc = entity.raw();
    entityDoc._version = entityVersion;
    entitiesCollection.upsert({ _id: entityId }, entityDoc);

    // Make sure nobody uses this event again.
    entity.isInvalid = true;
  }
  create() {
    const repo = this;
    return {
      entities(typeName) {
        this._entities = this._entities || {};
        this._entities[typeName] = this._entities[typeName] || {};
        return this._entities[typeName];
      },
      get(typeName, entityId) {
        let entity = this.entities(typeName)[entityId];
        if (!entity) {
          const doc = repo._get(typeName, entityId);
          if (doc) {
            const EntityType = repo.types()[typeName];
            entity = new EntityType(entity.properties);
            entity._id = doc._id;
            entity._version = doc._version;
          }
        }
        return entity;
      },
      commit() {
        _.each(this.entities(), (entities, typeName) => {
          _.each(entities, (entity) => {
            repo._commit(typeName, entity);
          });
        });

        // Don't reuse the entities we just saved
        this._entities = null;
      },
    };
  }
};
