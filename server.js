var http = require('http');
const readLine = require('readline');
const fs = require('fs');
const ECC = require('./lib/ecc.js');

const r1 = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
});

var args = process.argv.slice(2);
if(args[0] == 'init'){
  console.log("Server Init");
  var keyPair = ECC.secp256k1.randomKeyPair();
  r1.question('Common Name: ', (name) => {
    const servInfo = {
      "privateKey": keyPair.privateKey,
      "publicKeyInfo": {
          "algorithm": "ecies-aes128",
          "keyUsage": "encrypt",
          "publicKey": keyPair.publicKey
      },
      "commonName": name,
      "certificates": []
    };

    fs.writeFileSync('serv.json', JSON.stringify(servInfo));
    process.exit(0);
  });
}else if(args[0] == 'csr'){
  console.log("CSR - create certificate")
  var servJSON = JSON.parse(fs.readFileSync('serv.json', 'utf8'));

  r1.question('CA hostname: ', (hostName) => {
    const servInfo = {
      "commonName": servJSON.commonName,
      "publicKeyInfo": servJSON.publicKeyInfo
    };
    var postData = JSON.stringify(servInfo);

    var options = {
        hostname: hostName,
        port: 3001,
        path: '/csr',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          var servJSON = JSON.parse(fs.readFileSync('serv.json', 'utf8'));
          servJSON.certificates = JSON.parse(chunk);
          fs.writeFileSync('serv.json', JSON.stringify(servJSON));
          process.exit(0);
        });
    });

    req.on('error', function (e) {
      console.log('Problem with request:', e.message);
      process.exit(0);
    });

    req.write(postData);
    req.end();

  });

} else {
  // start web server
  startWebServer();
}



function startWebServer(){

  function sendResponse(res, body){
    console.log(body);
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(body);
  }

  var server = http.createServer().listen(3000);

  server.on('request', function(req, res){
      var body;
      req.setEncoding('utf8');

      req.on('data', function(data){
        body = data;
      });

      req.on('end', function(){
        // var post = querystring.parse(body);
        // do something with body
        if(req.method == 'POST' && body){
          if(req.url == '/handshake'){
            var servJSON = JSON.parse(fs.readFileSync('serv.json', 'utf8'));
            data = JSON.stringify(servJSON.certificates);
            sendResponse(res, data);
          }else if(req.url == '/msg'){
            data = JSON.stringify({msg:"success"});
            sendResponse(res, data);
          }else{
            sendResponse(res, JSON.stringify({msg:"invalid"}));
          }

        } else {
          sendResponse(res, JSON.stringify({msg:"invalid"}));
        }


      });
  });

  console.log('Listening on port 3000');
}



