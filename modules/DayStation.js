class DayStation{
    constructor(stationNumber,stationName,operators,training="",requiredOperators) {
    this.stationNumber = stationNumber;
    this.stationName = stationName;
    this.operators = operators;//Here is a list of operator names
    this.training = training;
    this.requiredOperators = requiredOperators;
    }
  }
  module.exports = DayStation;