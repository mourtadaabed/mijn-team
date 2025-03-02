class DayStation{
    constructor(stationNumber,stationName,operator,training="",requiredOperators) {
    this.stationNumber = stationNumber;
    this.stationName = stationName;
    this.operator = operator;
    this.training = training;
    this.requiredOperators = requiredOperators;
    }
  }
  module.exports = DayStation;