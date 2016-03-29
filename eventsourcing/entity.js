Entity = class {
  constructor(properties) {
    _.extend(this, properties);
  }
  static define(typeName) {
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
    // XXX get only serializable properties, not functions.
    return _.omit(this);
  }
};
