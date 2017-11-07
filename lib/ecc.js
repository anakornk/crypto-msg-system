const bigInt = require('big-integer');
const secp256k1Data = require('./secp256k1.json');
const EC = require('./ec.js')

//Elliptic Curve Cryptography
const ECC = {};

var p = bigInt(secp256k1Data.p,16);
var a = bigInt(secp256k1Data.a,16);
var b = bigInt(secp256k1Data.b,16);
var n = bigInt(secp256k1Data.n,16);
var h = bigInt(secp256k1Data.h,16);
var Gx = bigInt(secp256k1Data.Gx,16);
var Gy = bigInt(secp256k1Data.Gy,16);
var secp256k1 = new EC(p,a,b,h,n,Gx,Gy);

Object.defineProperty(ECC,'secp256k1',{
  get: function(){
    return secp256k1;
  }
});


module.exports = ECC;
