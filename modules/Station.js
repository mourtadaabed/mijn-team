class Station {
    constructor(station_number, station_name ,requiredOperators = 1, description) {
        this.station_number = station_number;
        this.station_name = station_name;
        this.description = description;
        this.requiredOperators =requiredOperators ;
    }
}

module.exports = Station;