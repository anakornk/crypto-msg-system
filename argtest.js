const readLine = require('readline');
const fs = require('fs');

const r1 = readLine.createInterface({
  input: process.stdin,
  output: process.stdout
});

var args = process.argv.slice(2);
if(args[0] == 'init'){

  // function askCommonName(){
  //   return new Promise((resolve) => {
  //     r1.question('Please input common name', (name) => {resolve(name)})
  //   });
  // }
  // askCommonName().then((name)=>{
  //   console.log(name);
  // });
  console.log("Certificate Authority Init")
  r1.question('Common Name: ', (name) => {
    // console.log(name);
    const caInfo = {
      "privateKey": "1234567890",
      "commonName": name,
      "certificates": []
    };

    fs.writeFileSync('ca2.json', JSON.stringify(caInfo));
    process.exit(0);
  });

} else {
  // start web server
  console.log("test");
}
