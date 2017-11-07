var bigInt = require('big-integer');
var Point = require('./point.js');
var shajs = require('sha.js');
var pbkdf2 = require('pbkdf2');
var aesjs = require('aes-js');


function EC(p,a,b,h,n,Gx,Gy){
  this.p = p;
  this.a = a;
  this.b = b;
  this.h = h;
  this.n = n;
  this.G = new Point(Gx,Gy,bigInt(1));
}

EC.prototype.hasPoint = function(point){
  if(point.isInfinity()){
    return false;
  }
  // y^2 = x^3 + ax + b;
  var affineX = point.getAffineX(this);
  var affineY = point.getAffineY(this);

  var p = this.p;
  var a = this.a;
  var b = this.b;
  var p = this.p;
  var left = affineY.pow(2).mod(p);
  var right = affineX.pow(3).add(a.multiply(affineX)).add(b).mod(p);
  return left.equals(right);
}

EC.prototype.sign = function(privateKey,message){
  var d = bigInt(privateKey,16);
  var m = message;
  do {
    do {
      // 1. Generate k between [1,n-1]
      var nMinus1 = this.n.subtract(1);
      var k;
      do {
        k = bigInt.randBetween(1,nMinus1);
      }
      while(k.leq(0) || k.geq(this.n))

      // 2. Compute kG
      var kG = this.G.multiply(this,k);

      // 3. Compute 𝑟 = x mod n, if r = 0 then goto step 1.
      var x = kG.getAffineX(this);
      var r = x.mod(this.n);
    }
    while(r.equals(0))

    // 4. hash message
    var hashedMsgHex = shajs('sha256').update(m).digest('hex');
    var e = bigInt(hashedMsgHex,16);

    // 5. Computer s = k^-1(e+dr)mod n
    var s = k.modInv(this.n).multiply(e.add(d.multiply(r))).mod(this.n);
  }while(s.equals(0))

  return {r: r.toString(16), s: s.toString(16)};
}

EC.prototype.verify = function(publicKey, message, signature){
  if(publicKey.length % 2 == 1){
    throw "failed"
  }
  var len = publicKey.length / 2;

  var Q = new Point(bigInt(publicKey.slice(0,len),16),bigInt(publicKey.slice(len),16),bigInt(1));
  var m = message;

  // 1. verify r and s
  var r = bigInt(signature.r,16);
  var s = bigInt(signature.s,16);
  if(r.leq(0)||r.geq(this.n) || s.leq(0) || s.geq(this.n)){
    throw "failed"
  }

  // 2. hash message
  var hashedMsgHex = shajs('sha256').update(m).digest('hex');
  var e = bigInt(hashedMsgHex,16);

  // 3. computer w=s^-1 mod n
  var w = s.modInv(this.n);

  // 4. Computer u1=ew mod n, u2=rw mod n
  var u1 = e.multiply(w).mod(this.n);
  var u2 = r.multiply(w).mod(this.n);

  // 5.
  var u1G = this.G.multiply(this, u1);
  var u2Q = Q.multiply(this, u2);
  var X = u1G.add(this, u2Q);
  //if X = 0
  if(X.isInfinity()){
    throw "failed"
  }

  // 6.
  var v = X.getAffineX(this);

  return v.equals(r);


}

EC.prototype.genPublicKey = function(privateKey){
  var publicKey = this.G.multiply(this, privateKey);
  return publicKey;
}

EC.prototype._roundLen32up = function(str){
  return 16*Math.ceil(str.length / 16);
}

EC.prototype._padLeft = function(str, length) {
    return '0'.repeat(Math.max(0, length - str.length)) + str;
}

EC.prototype._pointToKey = function(point){
  var pointX = point.getAffineX(this).toString(16);
  var pointY = point.getAffineY(this).toString(16);
  var lenX = this._roundLen32up(pointX);
  var lenY = this._roundLen32up(pointY);
  var len = lenX > lenY ? lenX : lenY;
  pointX = this._padLeft(pointX, len);
  pointY = this._padLeft(pointY, len);

  return pointX + pointY;
}

// bitsLen is Number
EC.prototype.randomKeyPair = function(){
  var privateKey = bigInt.randBetween(1,this.n.subtract(1));
  var publicKey = this.genPublicKey(privateKey);

  privateKey = privateKey.toString(16);
  var lenPrivate = this._roundLen32up(privateKey);
  privateKey = this._padLeft(privateKey,lenPrivate);

  // var publicKeyX = publicKey.getAffineX(this).toString(16);
  // var publicKeyY = publicKey.getAffineY(this).toString(16);
  // var lenX = this._roundLen32up(publicKeyX);
  // var lenY = this._roundLen32up(publicKeyY);
  // var lenPublic = lenX > lenY ? lenX : lenY;
  // publicKeyX = this._padLeft(publicKeyX, lenPublic);
  // publicKeyY = this._padLeft(publicKeyY, lenPublic);
  publicKey = this._pointToKey(publicKey);

  return {
    privateKey,
    publicKey
  };
}

EC.prototype.eciesEncrypt = function(publicKey, message){
  if(publicKey.length % 2 == 1){
    throw "failed"
  }
  var len = publicKey.length / 2;

  var Q = new Point(bigInt(publicKey.slice(0,len),16),bigInt(publicKey.slice(len),16),bigInt(1));

  var nMinus1 = this.n.subtract(1);
  var y;
  do {
    y = bigInt.randBetween(1,nMinus1);
  }
  while(y.leq(0) || y.geq(this.n))

  var shareSecretPoint = Q.multiply(this, y);
  var shareSecret = this._pointToKey(shareSecretPoint);
  var k = pbkdf2.pbkdf2Sync(shareSecret, 'salt', 1, 32, 'sha512')

  var aesCtr = new aesjs.ModeOfOperation.ctr(k,new aesjs.Counter(5));
  var textBytes = aesjs.utils.utf8.toBytes(message);
  var encryptedBytes = aesCtr.encrypt(textBytes);
  var encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);

  var otherPublicKeyPoint = this.G.multiply(this,y);
  var otherPublicKey = this._pointToKey(otherPublicKeyPoint);
  return {
    encryptedHex,
    otherPublicKey
  };
}

EC.prototype.eciesDecrypt = function(privateKey, encryptedHex, otherPublicKey){
    var x = bigInt(privateKey,16);

  if(otherPublicKey.length % 2 == 1){
    throw "failed"
  }
  var len = otherPublicKey.length / 2;

  var Q = new Point(bigInt(otherPublicKey.slice(0,len),16),bigInt(otherPublicKey.slice(len),16),bigInt(1));
  var shareSecretPoint = Q.multiply(this,x);
  var shareSecret = this._pointToKey(shareSecretPoint);
  var k = pbkdf2.pbkdf2Sync(shareSecret, 'salt', 1, 32, 'sha512')

  var aesCtr = new aesjs.ModeOfOperation.ctr(k,new aesjs.Counter(5));
  var encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);
  var decryptedBytes = aesCtr.decrypt(encryptedBytes);
  var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
  return decryptedText;
}

module.exports = EC;
