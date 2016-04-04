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

    return definition;
  }
  static create(properties) {
    return new this(properties);
  }
  static transform() {
    return (properties) => this.create(properties);
  }
  set(properties) {
    if (_.any(_.keys(properties), (key) => key.match(/^_/))) {
      throw new Error("Property names must not begin with an underscore.");
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
