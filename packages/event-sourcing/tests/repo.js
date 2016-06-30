import { EntityRepo as Repo, Entity, EntityEvent as Event, EntityCommand as Command } from "meteor/cwohlman:event-sourcing";
import { chai } from 'meteor/practicalmeteor:chai';
import { Mongo } from 'meteor/mongo';

const assert = chai.assert;

function matchDeeply(actual, expected) {
  _.each(expected, (val, key) => {
    const actualVal = actual[key];
    if (_.isObject(val)) {
      assert(_.isObject(actualVal), `${key} should be an object, but is ${typeof actualVal}`);
      matchDeeply(actualVal, val);
    } else {
      assert.equal(actualVal, val, `${key} should be ${val}, but is ${actualVal}`);
    }
  });
}

describe("Repo", function() {
  const entityName = "Goat";
  const eventName = "Shorn";
  describe("create", function() {
    const someOption = "someValue";
    it("should return an object", function() {
      const repo = Repo.create();

      assert.isObject(repo);
      assert.instanceOf(repo, Repo);
    });
    it("should set options", function() {
      const options = {
        someOption,
      };

      const repo = Repo.create(options);

      assert.deepEqual(repo.options(), options);
    });
  });
  describe("backed collections", function() {

  });
  describe("registerType", function() {
    it("should make the registered type available as repo.types[name]", function() {
      const repo = Repo.create();
      const GoatEntity = Entity.define(entityName);

      repo.registerType(GoatEntity);

      assert.equal(repo.types()[entityName], GoatEntity);
    });
    it("should initialize a mongo repo for entities", function() {
      const repo = Repo.create();
      const GoatEntity = Entity.define(entityName);

      repo.registerType(GoatEntity);

      assert.property(repo.collections()[entityName], "entities");
      assert.property(repo.collections()[entityName], "events");
      assert.instanceOf(repo.collections()[entityName].entities, Mongo.Collection);
      assert.instanceOf(repo.collections()[entityName].events, Mongo.Collection);
    });
    it("should not initialize a mongo repo for other types", function() {
      const repo = Repo.create();
      const GoatEntity = Entity.define(entityName);
      const GoatEvent = Event.define(GoatEntity, eventName, () => {});

      repo.registerType(GoatEvent);

      assert.isUndefined(repo.collections()[entityName]);
    });
    it("should not allow registering the same entity twice", function() {
      const repo = Repo.create();
      const GoatEntity = Entity.define(entityName);
      repo.registerType(GoatEntity);

      const duplicateRegistration = () => repo.registerType(GoatEntity);

      assert.throws(duplicateRegistration);
    });
  });
  describe("executeCommand", function() {
    let repo;
    let Book;
    let BookCheckedOut;
    let CheckOutBook;
    let BookRemoved;
    let RemoveBook;
    let commandWasCalled;
    let checkedOutBy = "Joe Patron";

    beforeEach(function() {
      Book = Entity.define('book');
      BookCheckedOut = Event.define(Book, 'checkedout', (book, properties) => {
        book.checkedOutBy = properties.checkedOutBy;
      });
      CheckOutBook = Command.define('checkout', (transaction, properties) => {
        let book = transaction.get(Book, properties.bookId);
        let event = BookCheckedOut.create({
          checkedOutBy: properties.checkedOutBy,
        });

        transaction.emit(event, book);
        commandWasCalled = true;

        return book._id;
      });
      BookRemoved = Event.define(Book, 'checkedout', (book) => {
        book.remove();
      });
      RemoveBook = Command.define('checkout', (transaction, properties) => {
        let book = transaction.get(Book, properties.bookId);
        let event = BookRemoved.create({
          bookId: properties.bookId,
        });

        transaction.emit(event, book);

        return book._id;
      });
      commandWasCalled = false;

      repo = Repo.create();
      repo.registerManyTypes(Book, BookCheckedOut, CheckOutBook);
    });
    it("should execute the command", function() {
      const command = CheckOutBook.create({
        bookId: null,
        checkedOutBy,
      });

      repo.executeCommand(command);

      assert.equal(commandWasCalled, true);
    });
    it("should return the command result", function() {
      const command = CheckOutBook.create({
        bookId: null,
        checkedOutBy,
      });

      const result = repo.executeCommand(command);

      assert.isString(result);
    });
    it("should insert the events", function() {
      const command = CheckOutBook.create({
        bookId: null,
        checkedOutBy,
      });

      repo.executeCommand(command);

      const events = repo.getEvents(Book);
      assert.isObject(events[0]);
      assert.sameMembers(_.keys(events[0]), [
        "_id",
        "_entityId",
        "_timestamp",
        "_command",
        "_event",
        "_version",
        "properties",
        "metadata",
      ]);
      assert.deepEqual(_.omit(events[0], "_id", "_entityId", "_timestamp"), {
        _command: 'checkout',
        _event: 'checkedout',
        _version: 1,
        properties: {
          checkedOutBy,
        },
        metadata: {

        },
      });
    });
    it("should insert new entities", function() {
      const command = CheckOutBook.create({
        bookId: null,
        checkedOutBy,
      });

      const result = repo.executeCommand(command);

      const entity = repo.get(Book, result);
      _.each({
        _id: result,
        _version: 1,
        _typeName: Book.prototype._typeName,
        checkedOutBy,
      }, (val, key) => assert.equal(entity[key], val, `${key} should be ${val}`));
    });
    it("should remove entities", function() {
      const bookId = repo.executeCommand(CheckOutBook.create({
        bookId: null,
        checkedOutBy,
      }));
      const command = RemoveBook.create({
        bookId,
      });

      const result = repo.executeCommand(command);

      const entity = repo.get(Book, result);
      assert.isUndefined(entity);
    });
    it("should log transactions", function() {
      const command = CheckOutBook.create({
        bookId: null,
        checkedOutBy,
      });

      const result = repo.executeCommand(command);

      const transactions = repo.getTransactions();
      const transaction = transactions[0];
      assert.isObject(transaction);
      matchDeeply(_.omit(transaction, '_timestamp', '_id'), {
        _command: 'checkout',
        _eventIds: [
          `${result}:1`,
        ],
        properties: {
          bookId: null,
          checkedOutBy,
        },
        metadata: {

        },
      });
    });
    it("should retry stuck transactions", function() {
      // There's some setup required here
      let entity;
      (function createBook() {
        const command = CheckOutBook.create({
          bookId: null,
          checkedOutBy,
        });

        const result = repo.executeCommand(command);

        entity = repo.get(Book, result);
      })();
      (function corruptTransactionLog() {
        repo.transactions().insert({
          _eventIds: [`${entity._id}:${entity._version + 1}`],
        });
      })();

      // Now actually try to checkout the book
      const command = CheckOutBook.create({
        bookId: entity._id,
        checkedOutBy,
      });
      const result = repo.executeCommand(command);

      // Check that the entity was updated
      entity = repo.get(Book, result);
      matchDeeply(entity, {
        _id: result,
        _version: 3,
        _typeName: Book.prototype._typeName,
        checkedOutBy,
      });
    });
  });
  describe("transactions", function() {

  });
});
