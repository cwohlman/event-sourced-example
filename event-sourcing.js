WeeklyPlanting = Entity.define("WeeklyPlanting");

PlantingCreated = EntityEvent.define(
  WeeklyPlanting,
  "PlantingCreated",
  (planting, properties) => {
    planting.owner = properties.owner;
  }
);

CreatePlanting = EntityCommand.define(
  "CreatePlanting",
  (transaction, properties) => {
    const entity = transaction.get(WeeklyPlanting, null);
    const event = PlantingCreated.create({
      owner: properties.owner,
    });
    transaction.emit(event, entity);

    return entity._id;
  }
);

UpdatedTargetDates = EntityEvent.define(
  WeeklyPlanting,
  "UpdatedTargetDates",
  (planting, properties) => {
    const dates = properties;
    planting.targetDates = dates;
  }
);

UpdateTargetDates = EntityCommand.define(
  "UpdateTargetDates",
  (transaction, properties) => {
    check(properties, {
      plantingId: String,
      transplantDate: Match.Optional(Date),
      harvestDate: Match.Optional(Date),
    });

    const event = UpdatedTargetDates.create(_.omit(properties, 'plantingId'));
    const entity = transaction.get(WeeklyPlanting, properties.plantingId);

    transaction.emit(event, entity);
  }
);

UpdatedForecastedDates = EntityEvent.define(
  WeeklyPlanting,
  "UpdatedForecastedDates",
  (planting, dates) => {
    planting.forecastedDates = dates;
  }
);

ComputeOptimalDate = EntityCommand.define(
  "ComputeOptimalDate",
  (transaction, properties) => {
    check(properties, {
      plantingId: String,
    });

    const planting = transaction.get(WeeklyPlanting, properties.plantingId);
    check(planting.targetDates, Match.ObjectIncluding({
      transplantDate: Date,
    }));

    const transplantDate = moment(planting.targetDates.transplantDate);
    if (!transplantDate.isValid()) {
      throw new Error("Date is invalid.");
    }

    const event = UpdatedForecastedDates.create({
      harvestDate: transplantDate.add(30, 'days').toDate(),
    });

    transaction.emit(event, planting);
  }
);

Repo = EntityRepo.create();
Repo.registerManyTypes(
  PlantingCreated,
  CreatePlanting,
  WeeklyPlanting,
  UpdatedTargetDates,
  UpdateTargetDates,
  UpdatedForecastedDates,
  ComputeOptimalDate
);

if (Meteor.isServer) {
  Repo.collections().WeeklyPlanting.entities.remove({});
  Repo.collections().WeeklyPlanting.events.remove({});
  Repo.transactions().remove({});
}

if (Meteor.isClient) {
  const plantingId = Repo.executeCommand(CreatePlanting.create({
    owner: 'me',
  }));

  Repo.executeCommand(UpdateTargetDates.create({
    plantingId,
    transplantDate: moment([2015]).toDate(),
  }));

  Repo.executeCommand(ComputeOptimalDate.create({
    plantingId,
  }));
}
