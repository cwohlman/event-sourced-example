import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';

export default class EntityEvent {
  constructor() { }
  static define(entityClass, typeName, applyTo) {
    check(entityClass, Function);
    check(typeName, String);
    check(applyTo, Function);

    const definition = class EntityEvent extends this { };
    definition.prototype._applyTo = applyTo;
    definition.prototype._typeName = typeName;
    definition.prototype._entityClass = entityClass;

    return definition;
  }
  static create(properties, metadata) {
    const e = new this();

    e._timestamp = new Date();
    _.each(properties, (value, key) => e.properties()[key] = value);
    _.each(metadata, (value, key) => e.metadata()[key] = value);

    return e;
  }
  applyTo(entity) {
    entity._version = this._version;

    return this._applyTo(entity, this.properties());
  }
  properties() {
    this._properties = this._properties || {};
    return this._properties;
  }
  metadata() {
    this._metadata = this._metadata || {};
    return this._metadata;
  }
  raw() {
    return {
      _entityId: this._entityId,
      _version: this._version,
      _command: this._command,
      _timestamp: this._timestamp,
      _event: this._typeName,
      properties: _.clone(this.properties()),
      metadata: _.clone(this.metadata()),
    };
  }
}
