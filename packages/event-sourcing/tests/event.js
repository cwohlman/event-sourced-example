import { EntityEvent as Event, Entity } from "meteor/cwohlman:event-sourcing";
import { chai } from 'meteor/practicalmeteor:chai';

const assert = chai.assert;
describe("Event", function() {
  const entityName = "goat";
  const eventName = "chew";
  const eventAction = () => {};
  const goatName = 'billy';
  const goatId = "XXX";
  const goatVersion = "123";
  const goatCommand = "chew";

  describe("define", function() {
    it("should return a constructor", function() {
      const GoatEntity = Entity.define(entityName);

      const GoatEvent = Event.define(GoatEntity, eventName, eventAction);

      assert.isFunction(GoatEvent);
    });
    it("should set _typeName", function() {
      const GoatEntity = Entity.define(entityName);

      const GoatEvent = Event.define(GoatEntity, eventName, eventAction);

      assert.equal(GoatEvent.prototype._typeName, eventName);
    });
    it("should check arguments", function() {
      const GoatEntity = Entity.define(entityName);

      const missingName = () => Event.define();
      const invalidName = () => Event.define({});
      const missingEntity = () => Event.define(GoatEntity);
      const invalidEntity = () => Event.define(GoatEntity, {});
      const missingAction = () => Event.define(GoatEntity, eventName);
      const invalidAction = () => Event.define(GoatEntity, eventName, {});

      assert.throws(missingName);
      assert.throws(invalidName);
      assert.throws(missingEntity);
      assert.throws(invalidEntity);
      assert.throws(missingAction);
      assert.throws(invalidAction);
    });
  });
  describe("create", function() {
    it("should return an object", function() {
      const GoatEntity = Entity.define(entityName);
      const GoatEvent = Event.define(GoatEntity, eventName, eventAction);

      const event = GoatEvent.create();

      assert.isObject(event);
      assert.instanceOf(event, GoatEvent);
      assert.instanceOf(event, Event);
    });
    it("should set passed properties", function() {
      const GoatEntity = Entity.define(entityName);
      const GoatEvent = Event.define(GoatEntity, eventName, eventAction);

      const expectedProperties = { goatName };
      const event = GoatEvent.create(expectedProperties);

      assert.deepEqual(event.properties(), expectedProperties);
    });
    it("should set passed metadata", function() {
      const GoatEntity = Entity.define(entityName);
      const GoatEvent = Event.define(GoatEntity, eventName, eventAction);

      const expectedMetadata = { goatName };
      const event = GoatEvent.create({}, expectedMetadata);

      assert.deepEqual(event.metadata(), expectedMetadata);
    });
    it("should set a timestamp", function() {
      const GoatEntity = Entity.define(entityName);
      const GoatEvent = Event.define(GoatEntity, eventName, eventAction);

      const expectedTimestamp = new Date();
      const event = GoatEvent.create();

      assert.instanceOf(event._timestamp, Date);
      assert.closeTo(+event._timestamp, +expectedTimestamp, 50);
    });
  });
  describe("applyTo", function() {
    it("should execute the event action", function() {
      let wasCalled = false;
      const GoatEntity = Entity.define(entityName);
      const GoatEvent = Event.define(GoatEntity, eventName, () => {
        wasCalled = true;
      });
      const event = GoatEvent.create();

      event.applyTo({});

      assert.equal(wasCalled, true);
    });
    it("should pass event properties to the event action", function() {
      let passedProperties;
      const expectedProperties = { goatName };
      const GoatEntity = Entity.define(entityName);
      const GoatEvent = Event.define(GoatEntity, eventName,
        (entity, properties) => {
          passedProperties = properties;
        }
      );
      const event = GoatEvent.create(expectedProperties);

      event.applyTo({});

      assert.deepEqual(passedProperties, expectedProperties);
    });
    it("should pass entity to the event action", function() {
      let passedEntity;
      const expectedEntity = { goatName };
      const GoatEntity = Entity.define(entityName);
      const GoatEvent = Event.define(GoatEntity, eventName,
        (entity) => {
          passedEntity = entity;
        }
      );
      const event = GoatEvent.create();

      event.applyTo(expectedEntity);

      assert.deepEqual(passedEntity, expectedEntity);
    });
    it("should set the entity version", function() {
      let passedEntity;
      const expectedEntity = { goatName };
      const GoatEntity = Entity.define(entityName);
      const GoatEvent = Event.define(GoatEntity, eventName,
        (entity) => {
          passedEntity = entity;
        }
      );
      const event = GoatEvent.create();
      event._version = goatVersion;

      event.applyTo(expectedEntity);

      assert.equal(passedEntity._version, goatVersion);
    });
  });
  describe("raw", function() {
    it("should return a raw copy of the event", function() {
      const expectedProperties = { goatName };
      const expectedMetadata = { goatName };
      const GoatEntity = Entity.define(entityName);
      const GoatEvent = Event.define(GoatEntity, eventName, eventAction);
      const event = GoatEvent.create(expectedProperties, expectedMetadata);
      event._entityId = goatId;
      event._version = goatVersion;
      event._command = goatCommand;
      event._timestamp = new Date();

      const result = event.raw();

      assert.deepEqual(result, {
        properties: expectedProperties,
        metadata: expectedMetadata,
        _entityId: goatId,
        _version: goatVersion,
        _command: goatCommand,
        _timestamp: event._timestamp,
        _event: eventName,
      });
    });
  });
});
