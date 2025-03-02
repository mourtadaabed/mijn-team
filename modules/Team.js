
const Shift = require('./Shift'); // Import the Shift class
class Team {
    constructor(name, shiftname) {
        this.teamName = name;
        this.shifts = [new Shift(shiftname)];
        this.stations = [];

    }

}

module.exports = Team;