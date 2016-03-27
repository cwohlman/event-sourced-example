WeeklyPlanting = Entity.define("WeeklyPlanting");

UpdatedTargetDates = EntityEvent.define(
  WeeklyPlanting,
  "UpdatedTargetDates",
  (event, planting) => {
    const dates = event.properties();
    planting.properties().targetDates = dates;
  }
);

UpdateTargetDates = EntityCommand.define(
  WeeklyPlanting,
  "UpdateTargetDates",
  (command, planting) => {
    check(command.properties(), {
      transplantDate: Match.Optional(Date),
      harvestDate: Match.Optional(Date),
    });

    const event = UpdatedTargetDates.create(command);
    planting.emitEvent(event);
  }
);

UpdatedForecastedDates = EntityEvent.define(
  WeeklyPlanting,
  "UpdatedForecastedDates",
  (event, planting) => {
    const dates = event.properties();
    planting.properties().forecastedDates = dates;
  }
);

ComputeOptimalDate = EntityCommand.define(
  WeeklyPlanting,
  "UpdateTargetDates",
  (command, planting) => {
    const targetDates = planting.properties().targetDates;
    check(targetDates, {
      transplantDate: Date,
    });

    const harvestDate = moment(targetDates.transplantDate).add(70, 'days');

    const event = UpdatedForecastedDates.create(command, {
      harvestDate: harvestDate.toDate(),
    });
    planting.emitEvent(event);
  }
);

if (Meteor.isClient) {
  planting = WeeklyPlanting.create();

  planting.applyCommand(UpdateTargetDates.create({
    transplantDate: moment([2015]).toDate(),
  }));
  planting.applyCommand(ComputeOptimalDate.create());
}