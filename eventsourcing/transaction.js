Transaction = class {
  constructor() {}
  static create(repo, command) {
    const transaction = new this();

    transaction.repo = repo;
    transaction.command = command;

    return transaction;
  }
  entities() {
    return (this._entities = this._entities || {});
  }
  events() {
    return (this._events = this._events || []);
  }
  get(type, id) {
    let entity;
    if (_.isNull(id)) entity = new type({ _id: id = Random.id(), _version: 0 });
    if (!entity) entity = this.entities()[id];
    if (!entity) entity = this.repo.get(type, id);

    this.entities()[id] = entity;

    return entity;
  }
  emit(event, entity) {
    event._entityId = entity._id;
    event._version = entity._version + 1;
    event._command = this.repo._getEntityTypeName(this.command);

    this.events().push(event);

    event.applyTo(entity);
  }
  commit() {
    this.repo.logTransaction(this);

    _.each(this.events(), (e) => {
      this.repo.emitEvent(e);
    });

    _.each(this.entities(), (entity) => {
      this.repo.updateEntity(entity);
    });

    this._events = null;
    this._completed = true;
  }
  raw() {
    const commandName = this.repo._getEntityTypeName(this.command);
    const eventIds = _.map(this.events(), (e) => {
      return `${e._entityId}:${e._version}`;
    });
    const doc = {
      _command: commandName,
      _eventIds: eventIds,
      properties: this.command.properties(),
      metadata: this.command.metadata(),
    };

    return doc;
  }
};
