# Event Sourcing for Meteor

This is just an example app, the idea is to prototype a model for using event sourcing in meteor.

# Current Features

What you have to define:

- **Entities** (Aggregates)
- **Commands**
- **Events**

What you get for free

- **Repo** Handles inserting your events into the db & also updating the default read model
- A default read model which is just a collection of your aggregates

# Future Features

- Replay your events (you can do this now, but you'd have to write all the code yourself).
- Create new read models
- Segregate the denormalizer from the **Repo**
- Concept of a Process Manager
- Make it scalable
- Multiple timelines (branching), e.g. roll-back state for a given entity and then do something else instead.
- Rollback events
- 


