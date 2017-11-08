var http = require('http');
const ECC = require('./lib/ecc.js');
const fs = require('fs');


var postData = JSON.stringify({
    msg: 'hello world'
});

var options = {
    hostname: 'localhost',
    port: 3000,
    path: '/handshake',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    }
};

var req = http.request(options, function (res) {
    // console.log('STATUS:', res.statusCode);
    // console.log('HEADERS:', JSON.stringify(res.headers));

    res.setEncoding('utf8');

    res.on('data', function (chunk) {
      var certificates = JSON.parse(chunk);
      var valid = false;
      if(certificates.length > 0){
        //yes encryption
        valid = true;
        try {
          var i;
          for(i=0;i<certificates.length-1;i++){
            const certificate = certificates[i];
            const nextCertificate = certificates[i+1];
            if(certificate.data.issuerName.commonName !== nextCertificate.subjectName.commonName){
              valid = false;
              break;
            }
            const verified = ECC.secp256k1.verify(nextCertificate.data.publicKeyInfo.publicKey,JSON.stringify(certificate.data), certificate.signature);
            if(!verified){
              valid = false;
              break;
            }
          }
          if(valid){
            var clientJSON = JSON.parse(fs.readFileSync('client.json', 'utf8'));
            var j;
            var certificate = certificates[i];
            for(j=0;j<clientJSON.length;j++){
              if(clientJSON[j].data.subjectName.commonName == certificate.data.issuerName.commonName){
                break;
              }
            }
            if(j>=clientJSON.length){
              valid = false;
            }
            if(valid){
              const verified = ECC.secp256k1.verify(clientJSON[0].data.publicKeyInfo.publicKey,JSON.stringify(certificate.data), certificate.signature);
              valid = (verified && ECC.secp256k1.verify(clientJSON[0].data.publicKeyInfo.publicKey,JSON.stringify(clientJSON[0].data), clientJSON[0].signature))
            }
          }
        }catch(err){
          valid = false;
        }
      }
      console.log(valid);
    });

    // res.on('end', function () {
    //     console.log('No more data in response.');
    // });
});

req.on('error', function (e) {
    console.log('Problem with request:', e.message);
});

req.write(postData);
req.end();
