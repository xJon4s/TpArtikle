// https://www.tutorialspoint.com/nodejs/nodejs_restful_api.htm
// https://malcoded.com/posts/angular-backend-express
// https://www.npmjs.com/package/cors
'use strict';

const express = require('express');
const app = express();
const fsPromises = require('fs').promises;
const bodyParser = require('body-parser');
app.use(bodyParser.json()); // for parsing application/json
const compression = require('compression');
app.use(compression());
const cors = require('cors');
app.use(cors({ origin: '*' }));

const db = __dirname + '/' + 'artikel.json';

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// https://github.com/lodash/lodash/blob/master/isString.js
function isString(value) {
    const type = typeof value
    return type === 'string' || (type === 'object' && value !== null && !Array.isArray(value) && getTag(value) === '[object String]')
}

// Prüft ob ein übergebener Artikel gültig ist
function hatArtikelFehler(artikel) {
    const a = artikel
    let ret = false

    if (isString(a.code))
        a.code = a.code.toUpperCase()
    ret = !isString(a.code) || a.code.length === 0 ||
        (!a.code.startsWith('IT') && !a.code.startsWith('DE')) ||
        (a.code.startsWith('IT') && a.code.length !== 8) ||
        (a.code.startsWith('DE') && a.code.length !== 10)
    ret = ret || !isString(a.beschreibung) || a.beschreibung.length === 0
    ret = ret || !Number.isInteger(a.anzahl) || a.anzahl < 0
    ret = ret || !Number.isFinite(a.einkaufspreis) || a.einkaufspreis < 0
    ret = ret || !Number.isFinite(a.verkaufspreis) || a.verkaufspreis < 0
    ret = ret || a.einkaufspreis > a.verkaufspreis
    ret = ret || !isString(a.einfuehrungsdatum)
    ret = ret || !Array.isArray(a.bilder) || a.bilder.length === 0
    if (!ret) {
        a.bilder.forEach(bild => {
            if (!ret && (!isString(bild.url) || bild.url.length === 0))
                ret = true
            else
                a.bilder.forEach(b => {
                    if (!ret && bild !== b && isString(b.url) && bild.url === b.url)
                        ret = true
                })
        })
    }
    return ret
}

// Liest die bestehenden Artikel aus der JSON-Datenbank 'db' und legt sie notfalls an
async function leseArtikel() {
    const data = await fsPromises.readFile(db, { flag: 'a+', encoding: 'utf8' })
    return data.length > 0 ? JSON.parse(data) : {}
}

// Schreibt die Artikel in die JSON-Datenbank 'db'
async function schreibeArtikel(data) {
    await fsPromises.writeFile(db, JSON.stringify(data), { encoding: 'utf8' })
}

app.post('/api/artikel', async (req, res, next) => {
    const artikel = req.body
    if (!isString(artikel.code)) {
        console.log('hinzufuegen(null)')
    } else {
        artikel.code = artikel.code.toUpperCase()
        console.log('hinzufuegen(' + artikel.code + ')')
    }
    if (hatArtikelFehler(artikel))
        res.sendStatus(400) // Bad request
    else {
        try {
            const data = await leseArtikel()
            data[artikel.code] = artikel
            await schreibeArtikel(data)
            res.location(req.path + (!req.path.endsWith('/') ? '/' : '') + artikel.code) // avoid double slashes (//)
            res.status(201).send(artikel) // Created with location header, since entity was added
        } catch (err) {
            next(err)
        }
    }
})
app.put('/api/artikel/:code', async (req, res, next) => {
    // req.params.code always defined
    req.params.code = req.params.code.toUpperCase()
    console.log('aendern(' + req.params.code + ')')
    const artikel = req.body
    artikel.code = req.params.code
    if (hatArtikelFehler(artikel))
        res.sendStatus(400) // Bad request
    else {
        try {
            const data = await leseArtikel()
            if (typeof data[artikel.code] === 'undefined')
                res.sendStatus(404) // Not found
            else {
                data[artikel.code] = artikel
                await schreibeArtikel(data)
                res.status(200).send(artikel) // Updated entity
            }
        } catch (err) {
            next(err)
        }
    }
})
app.delete('/api/artikel/:code', async (req, res, next) => {
    // req.params.code always defined
    req.params.code = req.params.code.toUpperCase()
    console.log('loeschen(' + req.params.code + ')')
    try {
        const data = await leseArtikel()
        if (typeof data[req.params.code] === 'undefined')
            res.sendStatus(404) // not found
        else {
            delete data[req.params.code]
            await schreibeArtikel(data)
            res.status(204).send() // No content
        }
    } catch (err) {
        next(err)
    }
})
app.delete('/api/artikel', async (req, res, next) => {
    console.log('alleLoeschen()')
    try {
        const data = await leseArtikel()
        if (Object.keys(data).length === 0)
            res.sendStatus(404) // not found
        else {
            await schreibeArtikel({})
            res.status(204).send() // No content
        }
    } catch (err) {
        next(err)
    }
})
app.get('/api/artikel', async (req, res, next) => {
    console.log('getArtikelliste()')
    try {
        const data = await leseArtikel()
        res.status(200).send(Object.values(data)) // all entities
    } catch (err) {
        next(err)
    }
})
app.get('/api/artikel/:code', async (req, res, next) => {
    // req.params.code always defined
    req.params.code = req.params.code.toUpperCase()
    console.log('getArtikel(' + req.params.code + ')')
    try {
        const data = await leseArtikel()
        if (typeof data[req.params.code] === 'undefined')
            res.sendStatus(404) // not found
        else
            res.status(200).send(data[req.params.code]) // return single entity
    } catch (err) {
        next(err)
    }
})

app.use((err, req, res, next) => { // Error handler
    res.status(500).send(err) // Internal server error
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/furz', (req, res) => (res.send(swaggerDocument)));

const server = app.listen(process.env.PORT || 1337, () => {
    const host = server.address().address
    const port = server.address().port
    console.log('Users app listening at http://%s:%s', host, port)
})