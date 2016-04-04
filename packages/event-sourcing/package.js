Package.describe({
  name: 'cwohlman:event-sourcing',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.3');
  api.use('ecmascript');

  api.mainModule('event-sourcing.js');
});

Package.onTest(function(api) {
  api.use('cwohlman:event-sourcing');
  api.versionsFrom('1.3');

  api.use([
    'ecmascript',
    'underscore',
    'random',
  ]);
  api.use(['practicalmeteor:mocha@2.1.1']);


  api.mainModule('event-sourcing-tests.js');
  api.addFiles('tests/entity.js');
  api.addFiles('tests/command.js');
  api.addFiles('tests/event.js');
  api.addFiles('tests/transaction.js');
  api.addFiles('tests/repo.js');
});
