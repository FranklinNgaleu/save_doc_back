import {Sequelize} from "sequelize";

const db = new Sequelize('projet_annuel', 'root', '', {
    host: "localhost",
    dialect: "mysql"
});

export default db;