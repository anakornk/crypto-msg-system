const bigInt = require('big-integer');

//every number in Point is bigInt
function Point(x,y,z) {
  this.x = x;
  this.y = y;
  this.z = z;
}

Point.prototype.isInfinity = function(){
  return this.x.equals(0) && this.y.equals(1) && this.z.equals(0);
}

Point.prototype.getAffineX = function(ec){
  return this.x.multiply(this.z.modInv(ec.p)).mod(ec.p);
}

Point.prototype.getAffineY = function(ec){
  return this.y.multiply(this.z.modInv(ec.p)).mod(ec.p);
}

Point.prototype.equals = function(ec, point){
  return (this.getAffineX(ec)==point.getAffineX(ec) && this.getAffineY(ec)==point.getAffineY(ec))
}

Point.prototype.add = function(ec, point){
  if(this.isInfinity()){
    return point;
  }else if(point.isInfinity()){
    return this;
  }
  var x1 = this.x;
  var y1 = this.y;
  var z1 = this.z;
  var x2 = point.x;
  var y2 = point.y;
  var z2 = point.z;

  // u = Y2 * Z1 - Y1 * Z2
  var u = y2.multiply(z1).subtract(y1.multiply(z2)).mod(ec.p);
  // v = X2 * Z1 - X1 * Z2
  var v = x2.multiply(z1).subtract(x1.multiply(z2)).mod(ec.p);
  if(u.notEquals(0) && v.equals(0)){
    return new Point(bigInt(0),bigInt(1),bigInt(0));
  }else if(u.notEquals(0) && v.notEquals(0)){
    var x3 = v.multiply(point.z.multiply(this.z.multiply(u.pow(2)).subtract(bigInt(2).multiply(this.x).multiply(v.pow(2)))).subtract(v.pow(3))).mod(ec.p);
    var y3 = point.z.multiply(bigInt(3).multiply(this.x).multiply(u).multiply(v.pow(2)).subtract(this.y.multiply(v.pow(3))).subtract(this.z.multiply(u.pow(3)))).add(u.multiply(v.pow(3))).mod(ec.p);
    var z3 = v.pow(3).multiply(this.z).multiply(point.z).mod(ec.p);
    if(x3.isNegative()){
      x3 = x3.add(ec.p);
    }
    if(y3.isNegative()){
      y3 = y3.add(ec.p);
    }
    if(z3.isNegative()){
      z3 = z3.add(ec.p);
    }
    return new Point(x3,y3,z3);
  }else{
    //double
    var w = bigInt(3).multiply(x1.pow(2)).add(ec.a.multiply(z1.pow(2))).mod(ec.p);
    var x3 = bigInt(2).multiply(y1).multiply(z1).multiply(w.pow(2).subtract(bigInt(8).multiply(x1).multiply(y1.pow(2)).multiply(z1))).mod(ec.p);
    var y3 = bigInt(4).multiply(y1.pow(2)).multiply(z1).multiply(bigInt(3).multiply(w).multiply(x1).subtract(bigInt(2).multiply(y1.pow(2)).multiply(z1))).subtract(w.pow(3)).mod(ec.p);
    var z3 = bigInt(8).multiply(y1.multiply(z1).pow(3)).mod(ec.p);
    if(x3.isNegative()){
      x3 = x3.add(ec.p);
    }
    if(y3.isNegative()){
     y3 = y3.add(ec.p);
    }
    if(z3.isNegative()){
      z3 = z3.add(ec.p);
    }
    return new Point(x3,y3,z3);

    // var x1 = this.x
    // var y1 = this.y

    // var y1z1 = y1.multiply(this.z).mod(ec.p)
    // var y1sqz1 = y1z1.multiply(y1).mod(ec.p)
    // var a = ec.a

    // // w = 3 * x1^2 + a * z1^2
    // var w = x1.square().multiply(bigInt(3))

    // if (!a.isZero()) {
    //   w = w.add(this.z.square().multiply(a))
    // }

    // w = w.mod(ec.p)
    // // x3 = 2 * y1 * z1 * (w^2 - 8 * x1 * y1^2 * z1)
    // var x3 = w.square().subtract(x1.shiftLeft(3).multiply(y1sqz1)).shiftLeft(1).multiply(y1z1).mod(ec.p)
    // // y3 = 4 * y1^2 * z1 * (3 * w * x1 - 2 * y1^2 * z1) - w^3
    // var y3 = w.multiply(bigInt(3)).multiply(x1).subtract(y1sqz1.shiftLeft(1)).shiftLeft(2).multiply(y1sqz1).subtract(w.pow(3)).mod(ec.p)
    // // z3 = 8 * (y1 * z1)^3
    // var z3 = y1z1.pow(3).shiftLeft(3).mod(ec.p)
    // return new Point(x3,y3,z3);

  }

  // //check if point equals this
  // if(this.equals(ec, point)){
  //   return this.double(ec);
  // }
  // return 1;
}

Point.prototype.double = function(ec){
  return this.add(ec,this);
}

Point.prototype.multiply = function(ec, k){
  var N = this;
  var Q = new Point(bigInt(0),bigInt(1),bigInt(0));
  while(k.isPositive()){
    var digit = k.mod(2);
    // var digit = k.value + "aa";
    // console.log(digit);
    if(digit.equals(1)){
      Q = Q.add(ec,N);
    }
    N = N.double(ec);
    k = k.shiftRight(1);
  }
  return Q;
}

module.exports = Point;
