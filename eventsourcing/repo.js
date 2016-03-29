EntityRepo = class {
  constructor() { }
  static create(options) {
    const repo = new this();

    repo._options = options;
    repo.init();

    return repo;
  }
  init() {
    // Init transactions repo
    this.transactions();
  }
  options() {
    this._options = this._options || {};
    return this._options;
  }
  types() {
    return (this._types = this._types || {});
  }
  collections() {
    return (this._collections = this._collections || {});
  }
  transactions() {
    if (!this._transactions) {
      if (this.options().unbacked) {
        this._transactions = new Mongo.Collection();
      } else {
        this._transactions = new Mongo.Collection('commandLog');
        if (Meteor.isServer) {
          this._transactions._ensureIndex({ _eventIds: 1 }, {unique: true});
        }
      }
    }
    return this._transactions;
  }
  handlers(typeName) {
    this._handlers = this._handlers || {};
    if (_.isUndefined(typeName)) return this._handlers;

    this._handlers[typeName] = this._handlers[typeName] || [];
    return this._handlers[typeName];
  }
  registerType(Definition) {
    const typeName = this._getTypeName(Definition);
    this.types()[typeName] = Definition;

    if (Definition.prototype instanceof Entity) {
      this.collections()[typeName] = this._createCollections(typeName);
    }
  }
  registerManyTypes(...types) {
    _.each(types, (Definition) => this.registerType(Definition));
  }
  registerHandler(Definition, handler) {
    const typeName = this._getTypeName(Definition);
    this.handlers(typeName).push(handler);
  }
  executeCommand(command) {
    const transaction = this.createTransaction(command);

    let result = command.execute(transaction);
    transaction.commit();

    return result;
  }
  createTransaction(command) {
    return Transaction.create(this, command);
  }
  get(Definition, id) {
    const typeName = this._getTypeName(Definition);
    const collections = this.collections()[typeName];

    return collections.entities.findOne({ _id: id });
  }
  emitEvent(event) {
    const entityClass = this._getEventEntityName(event);
    const collections = this.collections()[entityClass];

    let result = collections.events.insert(event.raw());
    this._callHandlers(event);

    return result;
  }
  logTransaction(transaction) {
    return this.transactions().insert(transaction.raw());
  }
  updateEntity(entity) {
    const typeName = this._getEntityTypeName(entity);
    const collections = this.collections()[typeName];

    return collections.entities.upsert(entity._id, entity.raw());
  }
  _getTypeName(Definition) {
    return Definition.prototype._typeName;
  }
  _getEntityTypeName(entity) {
    return entity._typeName;
  }
  _getEventEntityName(entity) {
    return this._getTypeName(entity._entityClass);
  }
  _createCollections(typeName) {
    if (this.options().unbacked) {
      return {
        entities: new Mongo.Collection(),
        events: new Mongo.Collection(),
      };
    }

    return {
      entities: new Mongo.Collection(`${typeName}/entities`),
      events: new Mongo.Collection(`${typeName}/events`),
    };
  }
  _callHandlers(event) {
    const typeName = this._getEntityTypeName(event);
    const handlers = this.handlers(typeName);

    _.each(handlers, (handler) => {
      handler(event);
    });
  }
};
