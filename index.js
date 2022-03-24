const express = require("express");
const app = express();
const exphbs = require("express-handlebars");
const expressFileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const secretKey = "MySecretKey";
const fs = require("fs");
const { getParticipantes, 
        getParticipante, 
        nuevoParticipante, 
        editarParticipante, 
        editarParticipanteEstado, 
        eliminarParticipante,
        getTotalParticipantes } = require("./consultas");

app.listen(3000, () => console.log("Server ON - Prueba Final, SkatePark"));

app.use(express.static(__dirname + "/public"));
app.use("/bootstrap", express.static(__dirname + "/node_modules/bootstrap/dist/css"));
app.use("/jquery", express.static(__dirname + "/node_modules/jquery/dist/"));
app.use("/axios", express.static(__dirname + "/node_modules/axios/dist/"));
app.use("/sweetalert", express.static(__dirname + "/node_modules/sweetalert2/dist/"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.engine(
    "handlebars",
    exphbs({
        defaultLayout: "main",
        layoutsDir: `${__dirname}/views/mainLayout`,
        partialsDir: `${__dirname}/views/componentes/`,
        helpers : {
            inc : (value) => parseInt(value) + 1
        }
    })
);

app.set("view engine", "handlebars");

app.use(
    expressFileUpload({
        limits: { fileSize: 5000000 },
        abortOnLimit: true,
        responseOnLimit: "El tamaño de la imagen supera el límite permitido de 5MB",
    })
);

/* La vista correspondiente a la ruta raíz debe mostrar todos los participantes
registrados y su estado de revisión. */
app.get("/", async (req, res) => {
    const participantes = await getParticipantes();
    res.render("Index", { participantes });
})
/* La vista del administrador debe mostrar los participantes registrados y permitir
aprobarlos para cambiar su estado. */
app.get("/Admin", (req, res) => {
    let { token } = req.query;
    jwt.verify(token, secretKey, async (err, decoded) => {
        if (err) {
            res.render("Error", { 
                error: "401 Unauthorized",
                message: err.message,
            })
        } else {
            const participantes = await getParticipantes();
            res.render("Admin", { participantes, isAdmin : decoded.admin });
        }
           
    });
    
})

/* El sistema debe permitir registrar nuevos participantes. */
app.get("/registro", async (req, res) => {
    const totalParticipantes = await getTotalParticipantes();
    res.render("Registro", { totalParticipantes : totalParticipantes.rows[0].count });
})

/* Se debe crear una vista para que los participantes puedan iniciar sesión con su correo y contraseña. */
app.get("/login", function (req, res) {
    res.render("Login");
})

app.post("/autenticar", async (req, res) => {
    let token = "";
    const { email, password } = req.body;

    if(email == "admin@skatepark.com" && password == "admin") {
        token = jwt.sign(
            {
                exp: Math.floor(Date.now() / 1000) + 300,
                admin: true,
            },
            secretKey
        );
        res.send(`/Admin?token=${token}`);
    } else {
        try {
            const participante = await getParticipante(email, password);
            
            if (!participante) throw "Usuario o contraseña incorrecta";
                
            token = jwt.sign(
                {
                    exp: Math.floor(Date.now() / 1000) + 300,
                    data: participante,
                },
                secretKey
            );
            res.send(`/Datos?token=${token}`);
        } catch (error) {
            res.status(401).send(error);
        }
    }
   
});

/* Luego de iniciar la sesión, los participantes deberán poder modificar sus datos,
exceptuando el correo electrónico y su foto. Esta vista debe estar protegida con JWT 
y los datos que se utilicen en la plantilla deben ser extraídos del token. */
app.get("/Datos", (req, res) => {

    let { token } = req.query;
    jwt.verify(token, secretKey, (err, decoded) => {
        err
            ? res.render("Error", { 
                error: "401 Unauthorized",
                message: err.message,
            })
            : res.render("Datos", { participante: decoded.data });
    });
});

app.post("/participantes", async (req, res) => {
    const {email, nombre, password, anos_experiencia, especialidad } = req.body;
    const { foto } = req.files;
   
    try {
        if (!foto.mimetype.startsWith("image/")) 
        throw "El archivo enviado no es una imagen.";
        
        foto.mv(`${__dirname}/public/imgs/${foto.name}`, async (err) => {
            if (err) res.status(500).send(`${err} Intente nuevamente.`);
        })
        await nuevoParticipante(email, nombre, password, anos_experiencia, especialidad, foto.name);
        res.send("¡Felicidades, ya estás inscrito!");
    } catch (error) {
        res.status(500).send(`${error} Intente nuevamente.`);
    }
})

app.put("/participantes", async (req, res) => {
    const {id, nombre, password, anos_experiencia, especialidad } = req.body;
    try {
        await editarParticipante(id, nombre, password, anos_experiencia, especialidad);
        res.send("Datos actualizados");
    } catch (error) {
        res.status(500).send(`${error} Intente nuevamente.`);
    }
})

app.put("/participantes/:id", async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        await editarParticipanteEstado(id, estado);
        res.send("Estado actualizado");
    } catch (error) {
        res.status(500).send(`${error} Intente nuevamente.`);
    }
})

app.delete("/participantes/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const respuesta = await eliminarParticipante(id);
        if(!respuesta) {
            throw "No existe un participante registrado con ese id.";
        }
        fs.unlink(`${__dirname}/public/imgs/${respuesta.rows[0].foto}`, (err) => {
            if (err) res.status(500).send(`${err} Intente nuevamente.`);
    
            res.send(`Participante ${respuesta.rows[0].nombre} eliminado`);
        });
    } catch (error) {
        res.status(500).send(`${error} Intente nuevamente.`);
    }
});
