import { EntityRepo as Repo, Entity, EntityEvent as Event, EntityCommand as Command } from "meteor/cwohlman:event-sourcing";
import { chai } from 'meteor/practicalmeteor:chai';
import { Mongo } from 'meteor/mongo';

const assert = chai.assert;
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

      const events = repo.getEvents(Book, null);
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
      assert.deepEqual(entity, {
        _id: result,
        _version: 1,
        _typeName: Book.prototype._typeName,
        checkedOutBy,
      });
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
      assert.deepEqual(_.omit(transaction, '_id'), {
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
  });
  describe("transactions", function() {

  });
});
