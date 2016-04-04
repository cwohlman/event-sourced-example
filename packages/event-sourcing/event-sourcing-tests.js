// Import and rename a variable exported by event-sourcing.js.
import { name as packageName } from "meteor/cwohlman:event-sourcing";
import { chai } from 'meteor/practicalmeteor:chai';

describe('Package name', function() {
  it('should be cwohlman:event-sourcing', function() {
    chai.assert.equal(packageName, 'cwohlman:event-sourcing');
  });
});
