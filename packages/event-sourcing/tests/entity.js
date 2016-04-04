import { Entity } from "meteor/cwohlman:event-sourcing";
import { chai } from 'meteor/practicalmeteor:chai';
import { _ } from 'meteor/underscore';

const assert = chai.assert;
describe("Entity", function() {
  describe("define", function() {
    it("should return a constructor", function() {
      const name = "goat";
      const Goat = Entity.define(name);

      assert.isFunction(Goat);
    });
    it("should set _typeName", function() {
      const name = "goat";

      const Goat = Entity.define(name);

      assert.equal(Goat.prototype._typeName, name);
    });
    it("should check arguments", function() {
      const missingName = () => Entity.define();
      const invalidName = () => Entity.define({});

      assert.throws(missingName);
      assert.throws(invalidName);
    });
  });
  describe("create", function() {
    it("should return an object", function() {
      const name = "goat";
      const Goat = Entity.define(name);

      const goat = Goat.create();

      assert.isObject(goat);
    });
    it("should set passed properties", function() {
      const name = "goat";
      const Goat = Entity.define(name);

      const goatName = 'billy';
      const goat = Goat.create({
        name: goatName,
      });

      assert.equal(goat.name, goatName);
    });
  });
  describe("transform", function() {
    it("should return a function", function() {
      const name = "goat";
      const Goat = Entity.define(name);

      const transform = Goat.transform();

      assert.isFunction(transform);
    });
    it("should return a function which returns entities and sets properties", function() {
      const name = "goat";
      const Goat = Entity.define(name);
      const transform = Goat.transform();

      const goatName = 'billy';
      const result = transform({
        goatName,
      });

      assert.isObject(result);
      assert.instanceOf(result, Goat);
      assert.equal(result.goatName, goatName);
    });
  });
  describe("set", function() {
    it("should set properties", function() {
      const name = "goat";
      const Goat = Entity.define(name);
      const goat = Goat.create();

      const goatName = 'billy';
      goat.set({
        goatName,
      });

      assert.equal(goat.goatName, goatName);
    });
    it("should throw on underscore properties", function() {
      const name = "goat";
      const Goat = Entity.define(name);
      const goat = Goat.create();

      const goatName = 'billy';
      const action = function() {
        goat.set({
          _goatName: goatName,
        });
      };

      assert.throws(action, "underscore");
    });
  });
  describe("raw", function() {
    it("should return a raw copy of the entity", function() {
      const goatId = "123";
      const name = "goat";
      const Goat = Entity.define(name);
      const goatName = 'billy';
      const goat = Goat.create({
        goatName,
      });
      goat._id = goatId;

      const result = goat.raw();

      assert.deepEqual(result, {
        goatName,
        _typeName: name,
        _id: goatId,
      });
    });
  });
});
