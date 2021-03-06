var request = require('request');
var config = require('config');

// Set the headers
var headers = {
    'User-Agent':       'Super Agent/0.0.1',
    'Content-Type':     'application/x-www-form-urlencoded'
}

var RUrl = config.get('RUrl'),
    enrichUrl = config.get('enrichUrl');

exports.query = function(input,cb){
    var queryUrl = RUrl[input.config['db-version']][input.user.endpoint];
    if(input.config.searchMethod == "geneSet"){
        if(input.config.aggravate){
        var upGenes = input.data.upGenes,
            dnGenes = input.data.dnGenes;
        }else{
            // reverse search
            var upGenes = input.data.dnGenes,
                dnGenes = input.data.upGenes;
        }

        var json = {upGenes:upGenes,dnGenes:dnGenes,
          combination:input.config.combination,
          dbVersion:input.config['db-version'],
          method:'geneSet'};

        // package json data in form request.
        var options = {
            url: queryUrl,
            method: 'POST',
            headers: headers,
            form: {json:JSON.stringify(json)}
        }
    }else if(input.config.searchMethod == "CD"){

        if(input.config.aggravate) direction = 'mimic';
        else direction = 'reverse';

        var json = {input:input.data,method:'CD',
          combination:input.config.combination,
          dbVersion:input.config['db-version'],
          direction:direction};
        var options = {
            url: queryUrl,
            method: 'POST',
            headers: headers,
            form: {json:JSON.stringify(json)}
        }
    }else{
        cb({"err":"search method is not CD or geneSet. It is "+input.config.searchMethod+"."})
    }

    // console.log('queryUrl',queryUrl);
    // console.log(options.form.method,options.form.combination,options.form.direction);
    // Start the request
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // Print out the response body
            // console.log(body,typeof(body))
            // res.send(body);
            // var enrichRes = JSON.parse(body);
            // console.log('success');
            // console.log('body',body);
            var topMatches = JSON.parse(body);
            topMatches.overlap = [];
            // restructure overlap
            if(input.config.searchMethod == "geneSet"){
                if(input.config.aggravate){
                    topMatches.upGenes.forEach(function(e,i){
                        var overlapItem = {};
                        overlapItem['up/up'] =  e;
                        overlapItem['dn/dn'] = topMatches.dnGenes[i];
                        topMatches.overlap.push(overlapItem);
                    });
                }else{
                    // debugger;
                    topMatches.upGenes.forEach(function(e,i){
                        var overlapItem = {};
                        overlapItem['up/dn'] =  topMatches.dnGenes[i];
                        overlapItem['dn/up'] = e;
                        topMatches.overlap.push(overlapItem);
                    });
                }
                delete topMatches.upGenes;
                delete topMatches.dnGenes;
            }else{
                topMatches.upCd.forEach(function(e,i){
                    var overlapItem = {};
                    overlapItem['up'] = e;
                    overlapItem['dn'] = topMatches.dnCd[i];
                    topMatches.overlap.push(overlapItem);
                });
                delete topMatches.upCd;
                delete topMatches.dnCd;
            }

            cb(topMatches);
        }
    });
}

exports.drugEnrich = function(input,cb){
    // input is a json string
    var options = {
            url: enrichUrl,
            method: 'POST',
            headers: headers,
            form: {input:input}
        }

    request(options, function (error, response, body) {
        // console.log(body);
        cb(JSON.parse(body));
    });
}
