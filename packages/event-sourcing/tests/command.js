import { EntityCommand as Command } from "meteor/cwohlman:event-sourcing";
import { chai } from 'meteor/practicalmeteor:chai';

const assert = chai.assert;
describe("Command", function() {
  const goatName = "billy";
  const commandName = "herd";
  const commandAction = () => {};

  describe("define", function() {
    it("should return a constructor", function() {
      const GoatCommand = Command.define(commandName, commandAction);

      assert.isFunction(GoatCommand);
    });
    it("should set _typeName", function() {
      const GoatCommand = Command.define(commandName, commandAction);

      assert.equal(GoatCommand.prototype._typeName, commandName);
    });
    it("should check arguments", function() {
      const missingName = () => Command.define();
      const invalidName = () => Command.define({});
      const missingAction = () => Command.define(commandName);
      const invalidAction = () => Command.define(commandName, {});

      assert.throws(missingName);
      assert.throws(invalidName);
      assert.throws(missingAction);
      assert.throws(invalidAction);
    });
  });
  describe("create", function() {
    it("should return an object", function() {
      const GoatCommand = Command.define(commandName, commandAction);

      const command = GoatCommand.create();

      assert.isObject(command);
      assert.instanceOf(command, GoatCommand);
    });
    it("should set passed properties", function() {
      const GoatCommand = Command.define(commandName, commandAction);

      const command = GoatCommand.create({
        goatName,
      });

      assert.deepEqual(command.properties(), {
        goatName,
      });
    });
    it("should set passed metadata", function() {
      const GoatCommand = Command.define(commandName, commandAction);

      const command = GoatCommand.create({}, {
        goatName,
      });

      assert.deepEqual(command.metadata(), {
        goatName,
      });
    });
  });
  describe("execute", function() {
    it("should execute the command action", function() {
      let wasCalled;
      const GoatCommand = Command.define(commandName, () => {
        wasCalled = true;
      });
      const command = GoatCommand.create();

      command.execute();

      assert.equal(wasCalled, true);
    });
    it("should pass properties to the command action", function() {
      let expectedProperties = { goatName };
      let passedProperties;
      const GoatCommand = Command.define(commandName, (transaction, properties) => {
        passedProperties = properties;
      });
      const command = GoatCommand.create(expectedProperties);

      command.execute();

      assert.deepEqual(passedProperties, expectedProperties);
    });
    it("should pass the transaction to the command action", function() {
      let expectedTransaction = { goatName };
      let passedTransaction;
      const GoatCommand = Command.define(commandName, (transaction) => {
        passedTransaction = transaction;
      });
      const command = GoatCommand.create();

      command.execute(expectedTransaction);

      assert.deepEqual(passedTransaction, expectedTransaction);
    });
    it("should return the result from the command action", function() {
      let expectedResult = { goatName };
      const GoatCommand = Command.define(commandName, () => expectedResult);
      const command = GoatCommand.create();

      let result = command.execute();

      assert.deepEqual(result, expectedResult);
    });
  });
  describe("raw", function() {
    it("should return a raw copy of the command", function() {
      let expectedProperties = { goatName };
      let expectedMetadata = { goatName };
      const GoatCommand = Command.define(commandName, commandAction);
      const command = GoatCommand.create(expectedProperties, expectedMetadata);

      const result = command.raw();

      assert.deepEqual(result, {
        _command: commandName,
        properties: expectedProperties,
        metadata: expectedMetadata,
      });
    });
  });
});
