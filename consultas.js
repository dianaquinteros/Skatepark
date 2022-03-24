const { Pool } = require("pg");
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    password: "postgres",
    database: "skatepark",
    port: 5432,
});

async function getParticipantes() {
    const result = await pool.query(`SELECT * FROM skaters ORDER BY id`);
    return result.rows;
}

async function getParticipante(email, password) {
    const result = await pool.query(
        `SELECT * FROM skaters WHERE email = '${email}' AND password = '${password}'`
    );
    return result.rows[0];
}

async function nuevoParticipante(email, nombre, password, anos_experiencia, especialidad, foto) {
    const result = await pool.query(
        `INSERT INTO skaters (email, nombre, password, anos_experiencia, especialidad, foto, estado) 
         VALUES ('${email}', '${nombre}', '${password}', ${anos_experiencia}, '${especialidad}', '${foto}', false) RETURNING *`
    );
    return result.rows[0];
}

async function editarParticipante(id, nombre, password, anos_experiencia, especialidad) {
    const result = await pool.query(
        `UPDATE skaters SET nombre = '${nombre}',   
                            password = '${password}', 
                            anos_experiencia = ${anos_experiencia}, 
                            especialidad = '${especialidad}'
         WHERE id = ${id} RETURNING *`);
    return result.rows[0];
}

async function editarParticipanteEstado(id, estado) {
    const result = await pool.query(
        `UPDATE skaters SET estado = ${estado} WHERE id = ${id} RETURNING *`);
    return result.rows[0];
}

async function eliminarParticipante(id) {
    const result = await pool.query(`DELETE FROM skaters WHERE id = ${id} RETURNING *`);
    return result;
}

async function getTotalParticipantes() {
    const result = await pool.query(`SELECT COUNT(*) FROM skaters`);
    return result;
}

module.exports = {
    getParticipantes,
    getParticipante,
    nuevoParticipante,
    editarParticipante,
    editarParticipanteEstado,
    eliminarParticipante,
    getTotalParticipantes
};
