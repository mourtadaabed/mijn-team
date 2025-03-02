const User = require('./User'); // Import the User class
const Operator = require('./Operator'); // Import the Operator class
class Shift {
    constructor(shiftname) {
        this.name = shiftname;
        this.operators = [];
    }
    addOperator(operatorname){
        this.operators.push( new Operator(operatorname));
    }
    removeOperator(operatorname) {
        this.operators = this.operators.filter(operator => operator.name !== operatorname);
    }
}

module.exports = Shift;