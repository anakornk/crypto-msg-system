const http = require('http');
const ECC = require('../lib/ecc.js');
const readLine = require('readline');
const fs = require('fs');
const aesjs = require('aes-js');

var options = {
    hostname: 'localhost',
    port: 3000,
    path: '/handshake',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
};
var messageToSend = 'defaultext';

var derivedKey;

function messageResponse(res){
  res.setEncoding('utf8');
  res.on('data', function (chunk) {
      try {
        if(derivedKey){
          var aesCtr = new aesjs.ModeOfOperation.ctr(derivedKey,new aesjs.Counter(5));
          var encryptedBytes = aesjs.utils.hex.toBytes(chunk);
          var decryptedBytes = aesCtr.decrypt(encryptedBytes);
          var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
          console.log(decryptedText);
        }else{
          console.log(chunk);
        }
        process.exit(0);
      } catch (err) {
        console.log("Something is wrong");
        process.exit(0);
      }
  });
}

function receivedHandshake(res){
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
          if(certificate.data.issuerName.commonName !== nextCertificate.data.subjectName.commonName){
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
            const verified = ECC.secp256k1.verify(clientJSON[j].data.publicKeyInfo.publicKey,JSON.stringify(certificate.data), certificate.signature);
            valid = (verified && ECC.secp256k1.verify(clientJSON[j].data.publicKeyInfo.publicKey,JSON.stringify(clientJSON[j].data), clientJSON[j].signature))
          }
        }
      }catch(err){
        valid = false;
      }
    }
    if(valid){
      options.path = '/msg'
      options.headers = {'Content-Type': 'text/plain'};
      var msgReq = http.request(options, messageResponse);
      msgReq.on('error', function (e) {
          console.log('Problem with request:', e.message);
      });

      const publicKey = certificates[0].data.publicKeyInfo.publicKey
      const res = ECC.secp256k1.eciesEncrypt(publicKey,messageToSend);
      const data = {
        encryptedHex: res.encryptedHex,
        otherPublicKey: res.otherPublicKey
      };
      derivedKey = res.derivedKey;
      msgReq.write(JSON.stringify(data));
      msgReq.end();
    } else {
      console.log('Invalid Certificate');
      process.exit(0);
    }
  });
}

const r1 = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
});

r1.question('Server URL: ', (serverURL) => {
  var temp = serverURL.split(":");
  options.hostname = temp[0];
  options.port = temp[1] || 3000;
  r1.question('Message: ', (msg) =>{
    messageToSend = msg;
    var handshakeReq = http.request(options, receivedHandshake);
    handshakeReq.on('error', function (e) {
        console.log('Problem with request:', e.message);
    });
    handshakeReq.write(JSON.stringify({msg: 'hello world'}));
    handshakeReq.end();
  });
});


