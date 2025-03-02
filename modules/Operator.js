class Operator {
    constructor(name,number,rol="teammember") {
        this.name = name;
        this.number = number;
        this.rol = rol;
        this.stations = []; // Array to store stations assigned to the operator

    }
}

module.exports = Operator;