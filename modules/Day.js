const DayStation = require('./DayStation'); // Import the DayStation class
class Day {
  constructor(id,stations,extra) {
    this.id = id
    this.stations = stations;//a list that contains DayStation object
    this.extra = extra;//it's an list that contains names (string's)
  }

}

  


module.exports = Day;