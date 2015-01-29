var express = require('express');
var app = express();
var sigineRouter = express.Router();
var bodyParser = require('body-parser');
var sigine = require('./handlers2.js');


var jsonParser = bodyParser.json();
var urlencodedParser = bodyParser.urlencoded({extended:false});

app.set('views','./public/jade');
app.set('view engine','jade');

sigineRouter.use('/',express.static(__dirname + '/public'));

sigineRouter.post('/query',jsonParser,sigine.query);
sigineRouter.get('/meta',sigine.meta);
sigineRouter.get('/count',sigine.count);

sigineRouter.post('/input',urlencodedParser,sigine.geo2me);
sigineRouter.get('/:id',sigine.history);


app.use('/L1000CDS2',sigineRouter);

app.listen(8182);