class User {
    constructor(name, email, hashedPassword,team,shift,rol="user") {
        this.name = name;
        this.email = email;

        this.team_shifts = [team+"-"+shift];
        this.password = hashedPassword; // Store hashed password
    }

    add_team_shift(team_shift) {
        this.team_shifts.push(team_shift);
    }

    remove_team_shift(team_shift) {
        const index = this.team_shifts.indexOf(team_shift);
        if (index !== -1) {
            this.team_shifts.splice(index, 1);
        } else {
            console.log("Team shift not found.");
        }
    }

    get_team_shifts() {
        return this.team_shifts;
    }

    has_team_shift(team_shift) {
        return this.team_shifts.includes(team_shift);
    }

}

module.exports = User;