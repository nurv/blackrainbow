load("p1.js")

var code = readFile("x.jsc");

var first = exports.parse(code);
print(exports.gen_code(first));
var second = exports.parse(exports.gen_code(first));
