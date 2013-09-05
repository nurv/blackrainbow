load("p1.js")

var code = readFile("x.jsc");

var first = exports.parse(code);

var second = exports.parse(exports.gen_code(first));

print(exports.gen_code(second))
