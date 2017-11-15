var http = require('http');
const readLine = require('readline');
const fs = require('fs');
const ECC = require('../lib/ecc.js');

const r1 = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
});

var args = process.argv.slice(2);
if(args[0] == 'init'){
  console.log("Certificate Authority Init")
  var keyPair = ECC.secp256k1.randomKeyPair();
  r1.question('Common Name: ', (name) => {
    const caInfo = {
      "privateKey": keyPair.privateKey,
      "publicKeyInfo": {
          "algorithm": "ecdsa-sha256",
          "keyUsage": "verify",
          "publicKey":keyPair.publicKey
      },
      "commonName": name,
      "certificates": []
    };

    fs.writeFileSync('ca.json', JSON.stringify(caInfo));
    process.exit(0);
  });
} else if(args[0] == 'selfsign'){
  var caJSON = JSON.parse(fs.readFileSync('ca.json', 'utf8'));
  var certificate = {
    "data": {
      "subjectName": {
        "commonName": caJSON.commonName
      },
      "issuerName": {
        "commonName": caJSON.commonName
      },
      "publicKeyInfo": caJSON.publicKeyInfo
    }
  }
  certificate.signature = ECC.secp256k1.sign(caJSON.privateKey,JSON.stringify(certificate.data));
  console.log(JSON.stringify(certificate));
  process.exit(0);
} else if(args[0] == 'csr'){
  console.log("CSR - create certificate")
  var caJSON = JSON.parse(fs.readFileSync('ca.json', 'utf8'));

  r1.question('CA Server URL:', (serverURL) => {
    const caInfo = {
      "commonName": caJSON.commonName,
      "publicKeyInfo": caJSON.publicKeyInfo
    };
    var postData = JSON.stringify(caInfo);
    var temp = serverURL.split(":");

    var options = {
        hostname: temp[0],
        port: temp[1] || 3001,
        path: '/csr',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          var caJSON = JSON.parse(fs.readFileSync('ca.json', 'utf8'));
          caJSON.certificates = JSON.parse(chunk);
          fs.writeFileSync('ca.json', JSON.stringify(caJSON));
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
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(body);
  }

  var server = http.createServer().listen(process.env.PORT || 3001);

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
          if(req.url == '/csr'){
            body = JSON.parse(body);
            var caJSON = JSON.parse(fs.readFileSync('ca.json', 'utf8'));
            var certificates = Object.assign([],caJSON.certificates);
            var certificate = {
              "data": {
                "subjectName": {
                  "commonName": body.commonName
                },
                "issuerName": {
                  "commonName": caJSON.commonName
                },
                "publicKeyInfo": body.publicKeyInfo
              }
            }
            certificate.signature = ECC.secp256k1.sign(caJSON.privateKey,JSON.stringify(certificate.data));
            certificates.unshift(certificate);
            data = JSON.stringify(certificates);
            sendResponse(res, data);
          }
        } else {
          sendResponse(res, JSON.stringify({msg:"invalid"}));
        }


      });
  });

  console.log('Listening on port ', process.env.PORT || 3001);
}



