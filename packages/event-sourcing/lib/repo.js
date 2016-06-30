import { _ } from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';
import Entity from './entity.js';
import Transaction from './transaction.js';

export default class EntityRepo {
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
      const namespace = this.options().mongoNamespace;
      if (namespace) {
        this._transactions = new Mongo.Collection(`${namespace}/commandLog`);
        if (Meteor.isServer) {
          this._transactions._ensureIndex({ _eventIds: 1 }, {unique: true});
        }
      } else {
        this._transactions = new Mongo.Collection(null);
        const insert = this._transactions.insert;
        this._transactions.insert = function(doc) {
          // HACK - mimics an index
          const idsToCheck = doc._eventIds;
          if (_.isArray(idsToCheck)) {
            const transactions = this.find({
              _eventIds: {
                $in: idsToCheck,
              },
            }).count();

            if (transactions) throw new Error();
          }

          insert.apply(this, arguments);
        };
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

    this._checkName(typeName);
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
    try {
      transaction.commit();
    } catch (error) {
      this.rollbackStuckTransactions(transaction);
      transaction.rollback();
      if (command.retryCount() < 3) {
        console.log(`Retried transaction of type ${command._typeName}.`);
        command.incrementRetryCount();
        this.executeCommand(command);
      } else {
        throw error;
      }
    }
    return result;
  }
  rollbackStuckTransactions(transaction) {
    const idsToCheck = transaction.raw()._eventIds;

    const transactions = this.transactions().find({
      _eventIds: {
        $in: idsToCheck,
      },
    }).fetch();

    _.each(transactions, (t) => {
      let isStuckTransaction = false;
      _.each(t._eventIds, (id, i) => {
        let [ _entityId, _version ] = id.split(":");
        _version = Number(_version);
        let typeName;
        if (t._eventTypes) {
          typeName = t._eventTypes[i];
        } else {
          const conflictingEvent = _.findWhere(transaction.events(), {
            _entityId,
          });
          typeName = conflictingEvent && conflictingEvent._entityClass._typeName;
        }
        if (typeName) {
          const entity = this._get(typeName, _entityId);
          const event = this._getEvents(
            typeName,
            _entityId,
            { _version }
          )[0];

          const isStuckEntity = !entity || !event || (entity._version < event._version);

          if (isStuckEntity) {
            isStuckTransaction = true;
            // XXX instead of doing this we should roll back the transaction.
            if (entity) {
              const collections = this.collections()[typeName];
              collections.entities.update(entity._id, {
                $set: {
                  _version,
                },
              });
            }
          }
        }
      });

      if (isStuckTransaction) {
        this.transactions().update(t._id, {
          $set: {
            _failed: true,
          },
        });
      }
    });
  }
  createTransaction(command) {
    return Transaction.create(this, command);
  }
  get(Definition, id) {
    const typeName = this._getTypeName(Definition);
    const collections = this.collections()[typeName];
    const query = {};

    if (id) query._id = id;
    return collections.entities.findOne(query, { transform: Definition.transform() });
  }
  _get(typeName, id) {
    const Definition = this.types()[typeName];
    const collections = this.collections()[typeName];
    const query = {};

    if (id) query._id = id;
    return collections.entities.findOne(query, { transform: Definition.transform() });
  }
  getEvents(Definition, id, query = {}, options = {}) {
    const typeName = this._getTypeName(Definition, id, query, options);

    return this._getEvents(typeName, id, query, options);
  }
  _getEvents(typeName, id, query = {}, options = {}) {
    const collections = this.collections()[typeName];

    if (id) {
      query._entityId = id;
    }
    return collections.events.find(query, options).fetch();
  }
  getTransactions() {
    return this.transactions().find().fetch();
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

    // XXX sanitize entity._id
    // not sure exactly how to do this, maybe a simple check(_id, String)?

    // XXX for now we can't remove entities because then we wouldn't be able
    // to restore them. We should handle this better.
    // NOTE Users of this repo will need to filter out removed entities
    // since we don't remove them.
    // if (entity.removed()) {
    //   return collections.entities.remove({ _id: entity._id });
    // }

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
  _checkName(typeName) {
    if (this.types()[typeName]) {
      throw new Error(`Type already registered with same name: ${name}`);
    }
  }
  _createCollections(typeName) {
    const namespace = this.options().mongoNamespace;
    if (namespace) {
      return {
        entities: new Mongo.Collection(`${namespace}/${typeName}/entities`),
        events: new Mongo.Collection(`${namespace}/${typeName}/events`),
      };
    }

    return {
      entities: new Mongo.Collection(null),
      events: new Mongo.Collection(null),
    };
  }
  _callHandlers(event) {
    const typeName = this._getEntityTypeName(event);
    const handlers = this.handlers(typeName);

    _.each(handlers, (handler) => {
      handler(event);
    });
  }
}
