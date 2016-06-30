import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';

export default class Entity {
  constructor(properties) {
    _.extend(this, properties);
  }
  static define(typeName) {
    check(typeName, String);

    const definition = class Entity extends this { };
    definition.prototype._typeName = typeName;
    definition._typeName = typeName;

    return definition;
  }
  static create(properties) {
    return new this(properties);
  }
  static transform() {
    return (properties) => this.create(properties);
  }
  remove() {
    this._removed = true;
  }
  restore() {
    this._removed = false;
  }
  removed() {
    return this._removed;
  }
  exists() {
    return this._removed === false && this._version !== 0;
  }
  set(properties) {
    let errorKey;
    if (_.find(_.keys(properties), (key) => key.match(/^_/) && (errorKey = key))) {
      throw new Error(`Invalid property name "${errorKey}". Property names must not begin with an underscore.`);
    }
    _.extend(this, properties);
  }
  raw() {
    const result = {};

    _.each(this, (val, key) => {
      if (!_.isFunction(val)) result[key] = val;
    });

    result._typeName = this._typeName;

    return result;
  }
}
