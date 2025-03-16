class User {
    constructor(name, email, hashedPassword, team, shift, role="user") {
        this.name = name;
        this.email = email;
        this.password = hashedPassword;
        this.team_shifts = [{ team_shift: `${team}-${shift}`, role: role }];
    }
}
module.exports = User;