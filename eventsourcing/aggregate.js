Entity = class {
  properties() {
    this._properties = this._properties || {};
    return this._properties;
  }
  events() {
    this._events = this._events || [];
    return this._events;
  }
  commands() {
    this._commands = this._commands || [];
    return this._commands;
  }
  raw() {
    const doc = {
      properties: _.clone(this.properties()),
    };

    _.extend(doc, _.pick(this, '_id', '_version'));

    return doc;
  }
  applyEvent(event) {
    check(event, EntityEvent);

    event.applyTo(this);
  }
  emitEvent(event) {
    check(event, EntityEvent);

    this.events().push(event);
    this.applyEvent(event);
  }
  applyCommand(command) {
    check(command, EntityCommand);

    this.commands().push(command);
    return command.applyTo(this);
  }
  replay(events) {
    _.each(events, (event) => {
      this.applyEvent(event);
    });
  }
  static define(typeName) {
    check(typeName, String);

    const EntityType = class extends Entity { };
    EntityType.prototype.typeName = typeName;
    EntityType.typeName = typeName;

    return EntityType;
  }
  static create(snapshot) {
    check(snapshot, Match.Optional(Object));

    const entity = new this();
    entity._properties = snapshot;

    return entity;
  }
};

EntityEvent = class {
  properties() {
    this._properties = this._properties || {};
    return this._properties;
  }
  raw() {
    const doc = {
      properties: _.clone(this.properties()),
    };

    _.extend(doc, _.pick(
      this,
      '_id',
      '_version',
      '_command',
      '_entity',
      '_timestamp'
    ));

    return doc;
  }
  applyTo(entity) {
    check(entity, this.constructor.entity);

    this._applyTo(this, entity);
  }
  emit(entity) {
    this.constructor.emit(this, entity);
  }
  static emit(event, entity) {
    check(entity, this.constructor.entity);
    const handlers = this.handlers();

    _.each(handlers, (handler) => {
      handler.apply(event, entity);
    });
  }
  static handlers() {
    this._handlers = this._handlers || [];
    return this._handlers;
  }
  static on(handler) {
    check(handler, Function);

    this.handlers().push(handler);
  }
  static define(entityClass, typeName, applyTo) {
    check(entityClass, Function);
    check(typeName, String);
    check(applyTo, Function);

    const EventType = class extends this { };
    EventType.prototype._applyTo = applyTo;
    EventType.prototype.typeName = typeName;
    EventType.typeName = typeName;
    EventType.entity = entityClass;

    return EventType;
  }
  static create(command) {
    let payload = arguments[1];
    if (_.isUndefined(payload)) {
      payload = command.properties();
    }

    check(command, EntityCommand);
    check(payload, Object);

    const newEvent = new this();

    _.each(payload, (value, key) => {
      newEvent.properties()[key] = value;
    });
    newEvent._command = command.typeName;
    newEvent._timestamp = new Date();

    return newEvent;
  }
};

EntityCommand = class {
  properties() {
    this._properties = this._properties || {};
    return this._properties;
  }
  raw() {
    const doc = {
      properties: _.clone(this.properties()),
    };

    return doc;
  }
  applyTo(entity) {
    check(entity, this.constructor.entity);

    return this._applyTo(this, entity);
  }
  static define(entityClass, typeName, applyTo) {
    check(entityClass, Function);
    check(typeName, String);
    check(applyTo, Function);

    const CommandType = class extends this { };
    CommandType.prototype._applyTo = applyTo;
    CommandType.prototype.typeName = typeName;
    CommandType.typeName = typeName;
    CommandType.entity = entityClass;

    return CommandType;
  }
  static create(payload) {
    check(payload, Match.Optional(Object));

    const entity = new this();
    entity._properties = payload;

    return entity;
  }
};

// class Entity {
//   static fromSnapshot(snapshot) {
//     const newEntity = new 
//   }
//   constructor(id, commands, isNew = true) {
//     check(id, String);
//     check(commands, Array);

//     this._id = id;
//     if (isNew) {
//       _.each(commands, command => this.addCommand(command));
//     }
//   }
//   commit() {
//     let results;
//     let result = this.emitNextCommand();
//     while (result) {
//       results.push(result);
//       if (result instanceof Error) break;
//       result = this.emitNextCommand();
//     }
//     return results;
//   }
//   replayCommand(command) {
//     command.applyTo(this);
//   }
//   addCommand(command) {
//     this._outstandingCommands.push(command);
//     this.replayCommand(command);
//   }
//   emitCommand(command) {
//     let result = command.commit(this);
//     if (result instanceof Error) return result;
//     // XXX emit event

//     return result;
//   }
//   emitNextCommand() {
//     let command = this.outstandingCommands()[0];
//     if (!command) return false;

//     return this.emitCommand(command);
//   }
//   addAndCommit(command) {
//     this.addCommand(command);
//     return this.commit();
//   }
//   outstandingCommands() {
//     if (!this._outstandingCommands) this._outstandingCommands = [];
//     return this._outstandingCommands;
//   }
//   hasOutstandingCommands() {
//     if (!this._outstandingCommands) this._outstandingCommands = [];
//     return !!this._outstandingCommands.length;
//   }
// }
