EntityCommand = class {
  constructor() { }
  static define(typeName, action) {
    const definition = class EntityCommand extends this { };
    definition.prototype._action = action;
    definition.prototype._typeName = typeName;
    return definition;
  }
  static create(properties, metadata) {
    const command = new this();

    _.each(properties, (value, key) => command.properties()[key] = value);
    _.each(metadata, (value, key) => command.metadata()[key] = value);

    return command;
  }
  static createAndExecute(properties, metadata) {
    const command = this.create(properties, metadata);

    command.result = this.repo.executeCommand(command);

    return command;
  }
  execute(transaction) {
    return this._action(transaction, this.properties());
  }
  properties() {
    this._properties = this._properties || {};
    return this._properties;
  }
  metadata() {
    this._metadata = this._metadata || {};
    return this._metadata;
  }
};
